import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

import 'product_forms.dart';
import 'promotions.dart';
import 'seller_orders.dart';

String _groupOf(Product p) {
  if (p.status == 'archived') return 'archived';
  if (p.stock == 0) return 'out';
  if (p.stock <= 5) return 'low';
  return 'active';
}

const List<(String, String)> _tabs = [
  ('all', 'All'),
  ('active', 'Active'),
  ('low', 'Low stock'),
  ('out', 'Out of stock'),
  ('archived', 'Archived'),
];

/// The seller's "My Products" portal: status tabs, live product list, add/edit.
class SellerProductsScreen extends ConsumerStatefulWidget {
  const SellerProductsScreen(
      {super.key, required this.session, required this.shop});
  final AppSession session;
  final Shop shop;

  @override
  ConsumerState<SellerProductsScreen> createState() =>
      _SellerProductsScreenState();
}

class _SellerProductsScreenState extends ConsumerState<SellerProductsScreen> {
  String _tab = 'all';
  bool _sharingLocation = false;
  LatLng? _shopLocation;

  @override
  void initState() {
    super.initState();
    if (widget.shop.lat != null && widget.shop.lng != null) {
      _shopLocation = LatLng(widget.shop.lat!, widget.shop.lng!);
    }
  }

  Future<void> _shareShopLocation() async {
    if (_sharingLocation) return;
    final initial = _shopLocation ?? const LatLng(-6.7924, 39.2083);
    final selected = await showModalBottomSheet<_ShopLocationSelection>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _SellerLocationPicker(
        initial: initial,
        hasSavedLocation: _shopLocation != null,
      ),
    );
    if (selected == null || !mounted) return;
    setState(() => _sharingLocation = true);
    try {
      await ref.read(sellerRepositoryProvider).setShopLocation(
            lat: selected.point?.latitude,
            lng: selected.point?.longitude,
          );
      if (mounted) {
        setState(() => _shopLocation = selected.point);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text(
              'Shop pickup location updated for customers and assigned riders.'),
        ));
        ref.invalidate(myShopProvider);
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ));
      }
    } finally {
      if (mounted) setState(() => _sharingLocation = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final products = ref.watch(myProductsProvider(widget.shop.id));
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('My Products',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            Text(widget.shop.name,
                style: const TextStyle(fontSize: 12, color: AppColors.muted)),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Orders and settlements',
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(
              builder: (_) => SellerOrdersScreen(shop: widget.shop),
            )),
            icon: const Icon(Icons.receipt_long_outlined),
          ),
          IconButton(
            tooltip: 'Set shop pickup location on map',
            onPressed: _sharingLocation ? null : _shareShopLocation,
            icon: _sharingLocation
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.map_outlined),
          ),
          IconButton(
            tooltip: 'Advertise',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(
                  builder: (_) => SellerPromotionsScreen(shop: widget.shop)),
            ),
            icon: const Icon(Icons.campaign),
          ),
          IconButton(
            tooltip: 'Sign out',
            onPressed: () => ref.read(authRepositoryProvider).signOut(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showAddProductSheet(context, shop: widget.shop),
        icon: const Icon(Icons.add),
        label: const Text('Add product'),
      ),
      body: products.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => RetryPanel(
          message: 'Could not load your products.',
          onRetry: () => ref.invalidate(myProductsProvider(widget.shop.id)),
        ),
        data: (items) {
          final counts = <String, int>{
            'all': items.length,
            'active': 0,
            'low': 0,
            'out': 0,
            'archived': 0
          };
          for (final p in items) {
            counts[_groupOf(p)] = (counts[_groupOf(p)] ?? 0) + 1;
          }
          final visible = _tab == 'all'
              ? items
              : items.where((p) => _groupOf(p) == _tab).toList();

          return Column(
            children: [
              SizedBox(
                height: 54,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  itemCount: _tabs.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, i) {
                    final (id, label) = _tabs[i];
                    final selected = _tab == id;
                    return ChoiceChip(
                      selected: selected,
                      onSelected: (_) => setState(() => _tab = id),
                      label: Text('$label (${counts[id] ?? 0})'),
                      selectedColor: AppColors.brand600,
                      labelStyle: TextStyle(
                          color: selected ? Colors.white : AppColors.ink,
                          fontWeight: FontWeight.w600),
                    );
                  },
                ),
              ),
              Expanded(
                child: visible.isEmpty
                    ? const Center(child: Text('No products in this list.'))
                    : RefreshIndicator(
                        onRefresh: () async {
                          ref.invalidate(myProductsProvider(widget.shop.id));
                          await ref
                              .read(myProductsProvider(widget.shop.id).future);
                        },
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: visible.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 10),
                          itemBuilder: (context, i) => _ProductRow(
                            product: visible[i],
                            onTap: () => showEditProductSheet(context,
                                product: visible[i], shopId: widget.shop.id),
                          ),
                        ),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _SellerLocationPicker extends StatefulWidget {
  const _SellerLocationPicker(
      {required this.initial, required this.hasSavedLocation});
  final LatLng initial;
  final bool hasSavedLocation;

  @override
  State<_SellerLocationPicker> createState() => _SellerLocationPickerState();
}

class _SellerLocationPickerState extends State<_SellerLocationPicker> {
  late LatLng _selected = widget.initial;
  bool _gettingLocation = false;
  String? _message;

  Future<void> _useCurrentLocation() async {
    setState(() {
      _gettingLocation = true;
      _message = null;
    });
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        await _offerSettings(appSettings: false);
        return;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.deniedForever) {
        await _offerSettings(appSettings: true);
        return;
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.unableToDetermine) {
        setState(() => _message =
            'Allow location access or tap the map to set the shop entrance.');
        return;
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings:
            const LocationSettings(accuracy: LocationAccuracy.high),
      ).timeout(const Duration(seconds: 20));
      if (mounted) {
        setState(() {
          _selected = LatLng(position.latitude, position.longitude);
          _message =
              'Current location selected. Drag the map or tap to adjust.';
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _message =
            'Could not read GPS. You can still tap the map to select the shop entrance.');
      }
    } finally {
      if (mounted) setState(() => _gettingLocation = false);
    }
  }

  Future<void> _offerSettings({required bool appSettings}) async {
    setState(() => _message = appSettings
        ? 'Location permission is blocked. Allow it in app settings or tap the map instead.'
        : 'Turn on device location or tap the map to choose the shop entrance.');
    final open = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(appSettings ? 'Allow location access' : 'Turn on location'),
        content: Text(appSettings
            ? 'Allow KARIAKOO location access in app settings, then return here.'
            : 'Turn on device location to place the shop pin at your current position.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Choose on map')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Open settings')),
        ],
      ),
    );
    if (open == true) {
      if (appSettings) {
        await Geolocator.openAppSettings();
      } else {
        await Geolocator.openLocationSettings();
      }
    }
  }

  @override
  Widget build(BuildContext context) => SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: EdgeInsets.fromLTRB(
                16, 8, 16, 16 + MediaQuery.viewInsetsOf(context).bottom),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Set shop pickup point',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                const Text(
                    'Tap the map to mark your shop entrance. Customers and assigned riders can see this pin.'),
                const SizedBox(height: 12),
                KariakooMap(
                  key: ValueKey('${_selected.latitude}:${_selected.longitude}'),
                  initialCenter: _selected,
                  zoom: 16,
                  height: 300,
                  userAgentPackageName: 'com.kariakoo.seller',
                  onTap: (point) => setState(() => _selected = point),
                  pins: [
                    KariakooMapPin(
                      point: _selected,
                      label: 'Shop pickup point',
                      icon: Icons.store,
                      color: AppColors.brand700,
                    ),
                  ],
                ),
                if (_message != null) ...[
                  const SizedBox(height: 6),
                  Text(_message!,
                      style: const TextStyle(
                          color: AppColors.muted, fontSize: 12)),
                ],
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed:
                            _gettingLocation ? null : _useCurrentLocation,
                        icon: _gettingLocation
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.my_location),
                        label: const Text('Use my location'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () => Navigator.pop(
                            context, _ShopLocationSelection(_selected)),
                        icon: const Icon(Icons.save_outlined),
                        label: const Text('Save pin'),
                      ),
                    ),
                  ],
                ),
                if (widget.hasSavedLocation)
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: () => Navigator.pop(
                          context, const _ShopLocationSelection(null)),
                      icon: const Icon(Icons.delete_outline),
                      label: const Text('Remove saved location'),
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
}

class _ShopLocationSelection {
  const _ShopLocationSelection(this.point);
  final LatLng? point;
}

class _ProductRow extends StatelessWidget {
  const _ProductRow({required this.product, required this.onTap});
  final Product product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (_groupOf(product)) {
      'archived' => ('Archived', AppColors.muted),
      'out' => ('Out of stock', AppColors.danger),
      'low' => ('Low stock', AppColors.warning),
      _ => ('Active', AppColors.brand700),
    };
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.line),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                  color: AppColors.brand50,
                  borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.inventory_2_outlined,
                  color: AppColors.brand600),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(
                      '${formatTzs(product.priceTzs)} · ${product.stock} in stock',
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.muted)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999)),
              child: Text(label,
                  style: TextStyle(
                      fontSize: 11, color: color, fontWeight: FontWeight.w600)),
            ),
            const Icon(Icons.chevron_right, color: AppColors.muted),
          ],
        ),
      ),
    );
  }
}
