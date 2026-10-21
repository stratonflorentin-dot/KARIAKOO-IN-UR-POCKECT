import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

import 'product_forms.dart';
import 'promotions.dart';

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

  Future<void> _shareShopLocation() async {
    if (_sharingLocation) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Share shop pickup location?'),
        content: const Text(
          'Use this only while you are at your shop entrance. The saved pin is shown to customers on your shop page and to riders assigned to collect orders.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Not now'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Continue'),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    setState(() => _sharingLocation = true);
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw Exception('Turn on location services and try again.');
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw Exception('Allow location access to share your shop pickup point.');
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      await ref.read(sellerRepositoryProvider).setShopLocation(
            lat: position.latitude,
            lng: position.longitude,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Shop pickup location shared with customers and assigned riders.'),
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
            tooltip: 'Share shop pickup location',
            onPressed: _sharingLocation ? null : _shareShopLocation,
            icon: _sharingLocation
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.my_location),
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
