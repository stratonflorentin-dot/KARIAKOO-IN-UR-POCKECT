import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

import '../state/cart.dart';

const List<(String, String)> _zones = [
  ('kariakoo', 'Kariakoo & City Centre'),
  ('ilala', 'Ilala'),
  ('kinondoni', 'Kinondoni (Mwenge, Sinza)'),
  ('ubungo', 'Ubungo (Mbezi, Kimara)'),
  ('temeke', 'Temeke (Mbagala)'),
  ('kigamboni', 'Kigamboni'),
];

int _feeFor(String zone) => switch (zone) {
      'kariakoo' => 2000,
      'ilala' => 2500,
      'kinondoni' => 3500,
      'ubungo' => 4000,
      'temeke' => 4000,
      'kigamboni' => 5000,
      _ => 3000,
    };

/// Checkout: pick a zone + address + payment method, then place the order via
/// the server's place_order (which computes the real prices and PIN).
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});
  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _address = TextEditingController();
  String _zone = 'kariakoo';
  String _payment = 'mpesa';
  bool _busy = false;
  bool _gettingLocation = false;
  LatLng? _dropoffPoint;
  String? _locationMessage;
  // Stable per attempt, so a retry is idempotent on the server.
  late final String _idemKey = DateTime.now().microsecondsSinceEpoch.toString();

  @override
  void dispose() {
    _address.dispose();
    super.dispose();
  }

  Future<void> _useCurrentLocation() async {
    if (_gettingLocation || _busy) return;
    setState(() {
      _gettingLocation = true;
      _locationMessage = null;
    });
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        setState(() => _locationMessage =
            'Location is turned off. Turn it on in your device settings, then try again.');
        return;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.deniedForever) {
        setState(() => _locationMessage =
            'Location access is blocked. Allow it for KARIAKOO in app settings, then try again.');
        return;
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.unableToDetermine) {
        setState(() => _locationMessage =
            'Allow location access to add a precise delivery pin.');
        return;
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      ).timeout(const Duration(seconds: 20));
      if (mounted) {
        setState(() {
          _dropoffPoint = LatLng(position.latitude, position.longitude);
          _locationMessage =
              'Precise delivery pin added. You can update it any time.';
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _locationMessage =
            'Could not get your location. Check GPS and try again.');
      }
    } finally {
      if (mounted) setState(() => _gettingLocation = false);
    }
  }

  Future<void> _openLocationSettings() async {
    final message = _locationMessage ?? '';
    if (message.contains('app settings')) {
      await Geolocator.openAppSettings();
    } else {
      await Geolocator.openLocationSettings();
    }
  }

  Future<void> _placeOrder() async {
    final cart = ref.read(cartProvider);
    if (cart.isEmpty) {
      _snack('Your cart is empty.');
      return;
    }
    if (_address.text.trim().isEmpty) {
      _snack('Please enter a delivery address.');
      return;
    }
    setState(() => _busy = true);
    try {
      final items = [
        for (final l in cart)
          {'product_id': l.product.id, 'quantity': l.quantity}
      ];
      final res = await ref.read(ordersRepositoryProvider).placeOrder(
            items: items,
            zone: _zone,
            address: _address.text.trim(),
            paymentMethod: _payment,
            idempotencyKey: _idemKey,
          );
      ref.read(cartProvider.notifier).clear();
      ref.invalidate(myOrdersProvider);
      String? locationWarning;
      if (_dropoffPoint != null) {
        try {
          await ref.read(ordersRepositoryProvider).setOrderDropoffLocation(
                orderId: res['order_id'] as String,
                lat: _dropoffPoint!.latitude,
                lng: _dropoffPoint!.longitude,
              );
        } catch (_) {
          // The order is already placed. Keep the success path and tell the
          // customer the rider will use the written address instead.
          locationWarning =
              'The order was placed, but its GPS pin could not be saved. The rider will use your written address.';
        }
      }
      if (mounted) await _showPlaced(res, locationWarning: locationWarning);
    } catch (e) {
      _snack(
          'Could not place the order: ${e.toString().replaceFirst('Exception: ', '')}');
      setState(() => _busy = false);
    }
  }

  Future<void> _showPlaced(Map<String, dynamic> res,
      {String? locationWarning}) async {
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Text('Order ${res['reference'] ?? ''} placed'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
                'A rider will be assigned. Pay cash or mobile money on delivery.'),
            if (locationWarning != null) ...[
              const SizedBox(height: 10),
              Text(locationWarning,
                  style: const TextStyle(color: AppColors.warning)),
            ],
            if (res['pin'] != null) ...[
              const SizedBox(height: 14),
              const Text('Your delivery PIN',
                  style: TextStyle(color: AppColors.muted, fontSize: 12)),
              Text('${res['pin']}',
                  style: const TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 6,
                      color: AppColors.brand700)),
              const Text(
                  'Give this to the rider only when you receive your goods.',
                  style: TextStyle(fontSize: 12, color: AppColors.muted)),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).pop();
            },
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  void _snack(String m) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final merch = ref.watch(cartTotalProvider);
    final fee = _feeFor(_zone);
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Deliver to',
              style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _zone,
            items: [
              for (final z in _zones)
                DropdownMenuItem(value: z.$1, child: Text(z.$2))
            ],
            onChanged: (v) => setState(() => _zone = v ?? 'kariakoo'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _address,
            maxLines: 2,
            decoration:
                const InputDecoration(hintText: 'Street, area, landmark'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _busy || _gettingLocation ? null : _useCurrentLocation,
            icon: _gettingLocation
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.my_location),
            label: Text(_gettingLocation
                ? 'Getting location…'
                : _dropoffPoint == null
                    ? 'Use my current location'
                    : 'Update pin from my location'),
          ),
          const SizedBox(height: 8),
          Text(
            _dropoffPoint == null
                ? 'Tap the satellite map to pin your delivery entrance, or use your current location.'
                : 'Delivery pin: ${_dropoffPoint!.latitude.toStringAsFixed(5)}, ${_dropoffPoint!.longitude.toStringAsFixed(5)}',
            style: const TextStyle(fontSize: 12, color: AppColors.muted),
          ),
          const SizedBox(height: 8),
          KariakooMap(
            key: ValueKey(
                '${_dropoffPoint?.latitude}:${_dropoffPoint?.longitude}'),
            initialCenter: _dropoffPoint ?? const LatLng(-6.7924, 39.2083),
            zoom: _dropoffPoint == null ? 12 : 16,
            onTap: (point) => setState(() {
              _dropoffPoint = point;
              _locationMessage = 'Delivery pin selected on the map.';
            }),
            pins: [
              if (_dropoffPoint != null)
                KariakooMapPin(
                  point: _dropoffPoint!,
                  label: 'Delivery entrance',
                  icon: Icons.home_filled,
                  color: AppColors.brand700,
                ),
            ],
          ),
          if (_locationMessage != null) ...[
            const SizedBox(height: 4),
            Text(_locationMessage!,
                style: const TextStyle(fontSize: 12, color: AppColors.muted)),
            if (_locationMessage!.contains('settings'))
              TextButton.icon(
                onPressed: _openLocationSettings,
                icon: const Icon(Icons.settings_outlined, size: 18),
                label: Text(_locationMessage!.contains('app settings')
                    ? 'Open app settings'
                    : 'Open location settings'),
              ),
          ],
          const SizedBox(height: 24),
          const Text('Payment method',
              style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          RadioGroup<String>(
            groupValue: _payment,
            onChanged: (v) => setState(() => _payment = v ?? 'mpesa'),
            child: const Column(
              children: [
                _PaymentOption(value: 'mpesa', label: 'M-Pesa'),
                _PaymentOption(value: 'airtel', label: 'Airtel Money'),
                _PaymentOption(value: 'tigo', label: 'Mixx by Yas (Tigo)'),
                _PaymentOption(value: 'cod', label: 'Cash on delivery'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Divider(),
          _row('Items', formatTzs(merch)),
          _row('Delivery fee', formatTzs(fee)),
          const SizedBox(height: 4),
          _row('Total', formatTzs(merch + fee), bold: true),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: _busy ? null : _placeOrder,
            child: Text(_busy ? 'Placing…' : 'Place order'),
          ),
        ),
      ),
    );
  }

  Widget _row(String label, String value, {bool bold = false}) {
    final style = TextStyle(
        fontWeight: bold ? FontWeight.w800 : FontWeight.w400,
        fontSize: bold ? 18 : 14);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(color: bold ? AppColors.ink : AppColors.muted)),
          Text(value, style: style)
        ],
      ),
    );
  }
}

class _PaymentOption extends StatelessWidget {
  const _PaymentOption({required this.value, required this.label});
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) {
    return RadioListTile<String>(
        value: value, title: Text(label), contentPadding: EdgeInsets.zero);
  }
}
