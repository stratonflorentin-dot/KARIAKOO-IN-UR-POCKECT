import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:kariakoo_core/kariakoo_core.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/location.dart';
import 'rider_earnings.dart';

/// The rider's working screen: go online (real GPS → rider_set_presence),
/// see live job offers (accept/decline), and move an accepted delivery forward.
/// Everything here calls the Phase 6 dispatch RPCs — no fake data.
class RiderDashboard extends ConsumerStatefulWidget {
  const RiderDashboard({super.key, required this.session});
  final AppSession session;

  @override
  ConsumerState<RiderDashboard> createState() => _RiderDashboardState();
}

class _RiderDashboardState extends ConsumerState<RiderDashboard> {
  bool _online = false;
  bool _busy = false;
  String? _note;
  LocationSettingsTarget? _locationSettingsTarget;
  Timer? _offersRefreshTimer;
  Timer? _locationHeartbeat;
  StreamSubscription<Position>? _locationSubscription;
  bool _locationUpdateInProgress = false;
  LatLng? _lastLocation;

  @override
  void initState() {
    super.initState();
    _offersRefreshTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (mounted) ref.invalidate(myOffersProvider);
    });
  }

  @override
  void dispose() {
    _offersRefreshTimer?.cancel();
    _locationHeartbeat?.cancel();
    _locationSubscription?.cancel();
    super.dispose();
  }

  String get _riderId => widget.session.riderId!;

  Future<void> _toggleOnline(bool value) async {
    setState(() {
      _busy = true;
      _note = null;
      _locationSettingsTarget = null;
    });
    final dispatch = ref.read(dispatchRepositoryProvider);
    try {
      if (value) {
        final fix = await getCurrentFix();
        if (fix.error != null) {
          setState(() {
            _note = fix.error;
            _locationSettingsTarget = fix.settingsTarget;
          });
          return;
        }
        await dispatch.setPresence(online: true, lng: fix.lng, lat: fix.lat);
        _startLocationSharing();
        setState(() {
          _online = true;
          _lastLocation = LatLng(fix.lat!, fix.lng!);
          _note = 'You are online. Watching for jobs near you.';
        });
        ref.invalidate(myOffersProvider);
      } else {
        await _stopLocationSharing();
        await dispatch.setPresence(online: false);
        setState(() {
          _online = false;
          _lastLocation = null;
          _note = 'You are offline.';
        });
      }
    } catch (_) {
      setState(() => _note = 'Could not update your availability.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _startLocationSharing() {
    _locationSubscription?.cancel();
    _locationSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 20,
      ),
    ).listen((position) {
      if (mounted) {
        setState(() =>
            _lastLocation = LatLng(position.latitude, position.longitude));
      }
      _sendLocation(position.latitude, position.longitude);
    }, onError: (_) {
      if (mounted) {
        setState(() => _note =
            'Live GPS updates paused. Check that location remains enabled.');
      }
    });
    _locationHeartbeat?.cancel();
    _locationHeartbeat = Timer.periodic(const Duration(seconds: 45), (_) async {
      final fix = await getCurrentFix();
      if (fix.lat != null && fix.lng != null) {
        if (mounted) {
          setState(() => _lastLocation = LatLng(fix.lat!, fix.lng!));
        }
        await _sendLocation(fix.lat!, fix.lng!);
      }
    });
  }

  Future<void> _stopLocationSharing() async {
    _locationHeartbeat?.cancel();
    _locationHeartbeat = null;
    await _locationSubscription?.cancel();
    _locationSubscription = null;
  }

  Future<void> _sendLocation(double lat, double lng) async {
    if (!_online && !_busy || _locationUpdateInProgress) return;
    _locationUpdateInProgress = true;
    try {
      await ref
          .read(dispatchRepositoryProvider)
          .updateLocation(lat: lat, lng: lng);
    } catch (_) {
      // Keep the rider's screen usable; a later GPS tick retries the update.
    } finally {
      _locationUpdateInProgress = false;
    }
  }

  Future<void> _openLocationSettings() async {
    if (_locationSettingsTarget == LocationSettingsTarget.appPermission) {
      await Geolocator.openAppSettings();
    } else if (_locationSettingsTarget ==
        LocationSettingsTarget.deviceLocation) {
      await Geolocator.openLocationSettings();
    }
  }

  Future<void> _accept(String orderId) async {
    try {
      await ref.read(dispatchRepositoryProvider).acceptOffer(orderId);
      ref.invalidate(myOffersProvider);
      ref.invalidate(activeDeliveryProvider(_riderId));
    } catch (e) {
      _snack(_clean(e));
    }
  }

  Future<void> _decline(String orderId) async {
    try {
      await ref.read(dispatchRepositoryProvider).declineOffer(orderId);
      ref.invalidate(myOffersProvider);
    } catch (e) {
      _snack(_clean(e));
    }
  }

  Future<void> _advance(RiderDelivery delivery) async {
    final to = delivery.nextStep;
    if (to == null) return;
    try {
      await ref.read(dispatchRepositoryProvider).advance(delivery.orderId, to);
      ref.invalidate(activeDeliveryProvider(_riderId));
    } catch (e) {
      _snack(_clean(e));
    }
  }

  Future<void> _complete(RiderDelivery delivery) async {
    final pin = await _askPin();
    if (pin == null || pin.isEmpty) return;
    try {
      await ref
          .read(dispatchRepositoryProvider)
          .completeDelivery(delivery.orderId, pin);
      ref.invalidate(activeDeliveryProvider(_riderId));
      ref.invalidate(myOffersProvider);
      _snack('Delivery completed. Nice work!');
    } catch (e) {
      _snack(_clean(e));
    }
  }

  Future<void> _navigateForDelivery(
      RiderDelivery delivery, PickupStop? pickup) async {
    final lat = pickup != null ? pickup.lat : delivery.dropoffLat;
    final lng = pickup != null ? pickup.lng : delivery.dropoffLng;
    final address = pickup != null
        ? (pickup.address.isNotEmpty ? pickup.address : pickup.name)
        : delivery.dropoffAddress;
    if ((lat == null || lng == null) && address.trim().isEmpty) {
      _snack('No destination address or map pin is available yet.');
      return;
    }
    final destination = lat != null && lng != null ? '$lat,$lng' : address;
    final uri = Uri.https('www.google.com', '/maps/dir/', {
      'api': '1',
      'destination': destination,
      'travelmode': 'driving',
    });
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) &&
        mounted) {
      _snack('Could not open maps on this device.');
    }
  }

  Future<String?> _askPin() {
    final ctrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Customer's 4-digit PIN"),
        content: TextField(
          controller: ctrl,
          keyboardType: TextInputType.number,
          maxLength: 4,
          autofocus: true,
          decoration: const InputDecoration(hintText: '0000'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
              onPressed: () => Navigator.pop(ctx, ctrl.text.trim()),
              child: const Text('Confirm delivery')),
        ],
      ),
    );
  }

  String _clean(Object e) {
    final s = e.toString();
    return s.length > 120
        ? 'Something went wrong. Please try again.'
        : s.replaceFirst('Exception: ', '');
  }

  void _snack(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final offers = ref.watch(myOffersProvider);
    final active = ref.watch(activeDeliveryProvider(_riderId));
    final delivery = active.valueOrNull;
    final mapPins = <KariakooMapPin>[
      if (_lastLocation != null)
        KariakooMapPin(
          point: _lastLocation!,
          label: 'Your current position',
          icon: Icons.delivery_dining,
          color: AppColors.brand700,
        ),
      if (delivery != null && delivery.status == 'ACCEPTED')
        for (var index = 0; index < delivery.pickups.length; index++)
          if (delivery.pickups[index].lat != null &&
              delivery.pickups[index].lng != null)
            KariakooMapPin(
              point: LatLng(
                  delivery.pickups[index].lat!, delivery.pickups[index].lng!),
              label: 'Pickup ${index + 1}: ${delivery.pickups[index].name}',
              icon: Icons.store,
              color: AppColors.brand600,
            ),
      if (delivery != null &&
          delivery.status != 'ACCEPTED' &&
          delivery.dropoffLat != null &&
          delivery.dropoffLng != null)
        KariakooMapPin(
          point: LatLng(delivery.dropoffLat!, delivery.dropoffLng!),
          label: 'Customer drop-off',
          icon: Icons.location_on,
          color: AppColors.danger,
        ),
    ];
    final mapCenter = _lastLocation ??
        (mapPins.isNotEmpty
            ? mapPins.first.point
            : const LatLng(-6.7924, 39.2083));

    return Scaffold(
      appBar: AppBar(
        title: const Text('KARIAKOO Rider',
            style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            tooltip: 'Earnings and delivery history',
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(
              builder: (_) => RiderEarningsScreen(riderId: _riderId),
            )),
            icon: const Icon(Icons.account_balance_wallet_outlined),
          ),
          IconButton(
            tooltip: 'Sign out',
            onPressed: () => ref.read(authRepositoryProvider).signOut(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(myOffersProvider);
          ref.invalidate(activeDeliveryProvider(_riderId));
          await Future.wait([
            ref.read(myOffersProvider.future),
            ref.read(activeDeliveryProvider(_riderId).future),
          ]);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _OnlineCard(
                online: _online,
                busy: _busy,
                onChanged: _busy ? null : _toggleOnline),
            const SizedBox(height: 20),
            const _SectionTitle('Map & navigation'),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.line),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  KariakooMap(
                    key: ValueKey(
                        '${mapCenter.latitude}:${mapCenter.longitude}:${delivery?.orderId}'),
                    initialCenter: mapCenter,
                    pins: mapPins,
                    height: 280,
                    zoom: 13,
                    showGuideLine: mapPins.length > 1,
                    userAgentPackageName: 'com.kariakoo.rider',
                  ),
                  const SizedBox(height: 4),
                  Text(
                    !_online
                        ? 'Go online to show your GPS position and receive jobs.'
                        : delivery == null
                            ? 'Your location is updating while you are online. No active delivery yet.'
                            : delivery.status == 'ACCEPTED'
                                ? 'Map shows your location and available shop pickup pins.'
                                : 'Map shows your location and the customer drop-off pin.',
                    style:
                        const TextStyle(color: AppColors.muted, fontSize: 12),
                  ),
                ],
              ),
            ),
            if (_note != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                    color: AppColors.brand50,
                    borderRadius: BorderRadius.circular(12)),
                child: Text(_note!,
                    style: const TextStyle(color: AppColors.brand900)),
              ),
              if (_locationSettingsTarget != null)
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    onPressed: _openLocationSettings,
                    icon: const Icon(Icons.settings_outlined),
                    label: Text(_locationSettingsTarget ==
                            LocationSettingsTarget.appPermission
                        ? 'Open app settings'
                        : 'Turn on device location'),
                  ),
                ),
            ],
            const SizedBox(height: 24),
            const _SectionTitle('Active delivery'),
            const SizedBox(height: 8),
            active.when(
              loading: () => const Center(
                  child: Padding(
                      padding: EdgeInsets.all(16),
                      child: CircularProgressIndicator())),
              error: (_, __) => TextButton.icon(
                onPressed: () =>
                    ref.invalidate(activeDeliveryProvider(_riderId)),
                icon: const Icon(Icons.refresh),
                label: const Text('Could not load your delivery. Try again.'),
              ),
              data: (d) => d == null
                  ? const _Empty(
                      'No active delivery. Go online to receive jobs.')
                  : _ActiveDeliveryCard(
                      delivery: d,
                      onAdvance: () => _advance(d),
                      onComplete: () => _complete(d),
                      onNavigate: (pickup) => _navigateForDelivery(d, pickup)),
            ),
            const SizedBox(height: 24),
            const _SectionTitle('Job offers'),
            const SizedBox(height: 8),
            offers.when(
              loading: () => const Center(
                  child: Padding(
                      padding: EdgeInsets.all(16),
                      child: CircularProgressIndicator())),
              error: (_, __) => TextButton.icon(
                onPressed: () => ref.invalidate(myOffersProvider),
                icon: const Icon(Icons.refresh),
                label: const Text('Could not load offers. Try again.'),
              ),
              data: (list) {
                final live = list.where((o) => o.isLive).toList();
                if (live.isEmpty) {
                  return const _Empty('No job offers right now.');
                }
                return Column(
                  children: [
                    for (final o in live)
                      _OfferCard(
                          offer: o,
                          onAccept: () => _accept(o.orderId),
                          onDecline: () => _decline(o.orderId)),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _OnlineCard extends StatelessWidget {
  const _OnlineCard(
      {required this.online, required this.busy, required this.onChanged});
  final bool online;
  final bool busy;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: online ? AppColors.brand600 : AppColors.night,
        borderRadius: BorderRadius.circular(20),
      ),
      child: SwitchListTile(
        value: online,
        onChanged: onChanged,
        contentPadding: EdgeInsets.zero,
        activeThumbColor: AppColors.gold400,
        title: Text(
          online ? 'Online' : 'Offline',
          style: const TextStyle(
              color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18),
        ),
        subtitle: Text(
          busy
              ? 'Updating…'
              : (online
                  ? 'Receiving delivery requests'
                  : 'Turn on to receive jobs'),
          style: const TextStyle(color: Colors.white70),
        ),
      ),
    );
  }
}

class _ActiveDeliveryCard extends StatelessWidget {
  const _ActiveDeliveryCard(
      {required this.delivery,
      required this.onAdvance,
      required this.onComplete,
      required this.onNavigate});
  final RiderDelivery delivery;
  final VoidCallback onAdvance;
  final VoidCallback onComplete;
  final ValueChanged<PickupStop?> onNavigate;

  @override
  Widget build(BuildContext context) {
    final canAdvance = delivery.nextStep != null;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: AppColors.night, borderRadius: BorderRadius.circular(24)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(999)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.navigation, size: 14, color: Colors.white),
                    const SizedBox(width: 6),
                    Text(delivery.statusLabel,
                        style: const TextStyle(
                            color: Colors.white, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              Text('#${delivery.orderId.substring(0, 6)}',
                  style: const TextStyle(color: Colors.white70)),
            ],
          ),
          const SizedBox(height: 16),
          const Text('You earn',
              style: TextStyle(color: Colors.white60, fontSize: 12)),
          Text(formatTzs(delivery.riderPayoutTzs),
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.w800)),
          if (delivery.status == 'ACCEPTED' && delivery.pickups.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text('Pickup: ${delivery.pickups.first.name}',
                style: const TextStyle(color: Colors.white70)),
            if (delivery.pickups.first.address.isNotEmpty)
              Text(delivery.pickups.first.address,
                  style: const TextStyle(color: Colors.white60, fontSize: 12)),
          ] else if (delivery.dropoffAddress.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text('Drop-off: ${delivery.dropoffAddress}',
                style: const TextStyle(color: Colors.white70)),
          ],
          if (delivery.status == 'ACCEPTED' && delivery.pickups.isNotEmpty) ...[
            const SizedBox(height: 10),
            for (final pickup in delivery.pickups)
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => onNavigate(pickup),
                  icon: const Icon(Icons.directions),
                  label: Text('Navigate to ${pickup.name} pickup'),
                  style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: BorderSide(
                          color: Colors.white.withValues(alpha: .4))),
                ),
              ),
          ] else if (delivery.dropoffAddress.isNotEmpty ||
              (delivery.dropoffLat != null && delivery.dropoffLng != null)) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => onNavigate(null),
                icon: const Icon(Icons.directions),
                label: const Text('Navigate to customer'),
                style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side:
                        BorderSide(color: Colors.white.withValues(alpha: .4))),
              ),
            ),
          ],
          const SizedBox(height: 16),
          if (canAdvance)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.gold400,
                    foregroundColor: AppColors.ink),
                onPressed: onAdvance,
                child: Text(delivery.nextStepLabel ?? 'Continue'),
              ),
            )
          else
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.gold400,
                    foregroundColor: AppColors.ink),
                onPressed: onComplete,
                icon: const Icon(Icons.verified),
                label: const Text('Complete with customer PIN'),
              ),
            ),
        ],
      ),
    );
  }
}

class _OfferCard extends StatelessWidget {
  const _OfferCard(
      {required this.offer, required this.onAccept, required this.onDecline});
  final DeliveryOffer offer;
  final VoidCallback onAccept;
  final VoidCallback onDecline;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(formatTzs(offer.payoutTzs),
              style:
                  const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text('Order #${offer.orderId.substring(0, 6)}',
              style: const TextStyle(color: AppColors.muted)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                    onPressed: onDecline, child: const Text('Decline')),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                    onPressed: onAccept, child: const Text('Accept')),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Text(text.toUpperCase(),
      style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: AppColors.muted,
          letterSpacing: 0.5));
}

class _Empty extends StatelessWidget {
  const _Empty(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.line)),
        child: Text(text, style: const TextStyle(color: AppColors.muted)),
      );
}
