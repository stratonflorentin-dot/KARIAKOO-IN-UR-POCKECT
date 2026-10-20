import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

import 'product_forms.dart';

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
  const SellerProductsScreen({super.key, required this.session, required this.shop});
  final AppSession session;
  final Shop shop;

  @override
  ConsumerState<SellerProductsScreen> createState() => _SellerProductsScreenState();
}

class _SellerProductsScreenState extends ConsumerState<SellerProductsScreen> {
  String _tab = 'all';

  @override
  Widget build(BuildContext context) {
    final products = ref.watch(myProductsProvider(widget.shop.id));
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('My Products', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            Text(widget.shop.name, style: const TextStyle(fontSize: 12, color: AppColors.muted)),
          ],
        ),
        actions: [
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
        error: (_, __) => const Center(child: Text('Could not load your products.')),
        data: (items) {
          final counts = <String, int>{'all': items.length, 'active': 0, 'low': 0, 'out': 0, 'archived': 0};
          for (final p in items) {
            counts[_groupOf(p)] = (counts[_groupOf(p)] ?? 0) + 1;
          }
          final visible = _tab == 'all' ? items : items.where((p) => _groupOf(p) == _tab).toList();

          return Column(
            children: [
              SizedBox(
                height: 54,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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
                      labelStyle: TextStyle(color: selected ? Colors.white : AppColors.ink, fontWeight: FontWeight.w600),
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
                          await ref.read(myProductsProvider(widget.shop.id).future);
                        },
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: visible.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, i) => _ProductRow(
                            product: visible[i],
                            onTap: () => showEditProductSheet(context, product: visible[i], shopId: widget.shop.id),
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
              decoration: BoxDecoration(color: AppColors.brand50, borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.inventory_2_outlined, color: AppColors.brand600),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text('${formatTzs(product.priceTzs)} · ${product.stock} in stock',
                      style: const TextStyle(fontSize: 12, color: AppColors.muted)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
              child: Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
            ),
            const Icon(Icons.chevron_right, color: AppColors.muted),
          ],
        ),
      ),
    );
  }
}
