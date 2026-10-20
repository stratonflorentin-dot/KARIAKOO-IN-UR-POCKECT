import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

import '../../widgets/product_card.dart';
import '../category_products.dart';
import '../product_detail.dart';
import '../status_feed.dart';

class HomeTab extends ConsumerWidget {
  const HomeTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(featuredProductsProvider);
    final categories = ref.watch(categoriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('KARIAKOO', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.2)),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(featuredProductsProvider);
          await ref.read(featuredProductsProvider.future);
        },
        child: CustomScrollView(
          slivers: [
            const SliverToBoxAdapter(child: _Hero()),
            const SliverToBoxAdapter(child: StatusStrip()),
            SliverToBoxAdapter(child: _Categories(categories: categories)),
            products.when(
              loading: () => const SliverFillRemaining(child: Center(child: CircularProgressIndicator())),
              error: (e, _) => const SliverFillRemaining(
                child: Center(child: Text('Could not load the catalog. Pull to retry.')),
              ),
              data: (items) => items.isEmpty
                  ? const SliverFillRemaining(child: Center(child: Text('No products in the catalog yet.')))
                  : SliverPadding(
                      padding: const EdgeInsets.all(16),
                      sliver: SliverGrid(
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 0.70,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, i) {
                            final p = items[i];
                            return ProductCard(
                              product: p,
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => ProductDetailScreen(product: p)),
                              ),
                            );
                          },
                          childCount: items.length,
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero();
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: AppColors.night,
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Text('Karibu Kariakoo, online', style: TextStyle(color: AppColors.gold300, fontWeight: FontWeight.w600)),
          SizedBox(height: 6),
          Text(
            "Dar's biggest market,\ndelivered to your door.",
            style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold, height: 1.1),
          ),
        ],
      ),
    );
  }
}

class _Categories extends StatelessWidget {
  const _Categories({required this.categories});
  final AsyncValue<List<Category>> categories;

  @override
  Widget build(BuildContext context) {
    return categories.maybeWhen(
      data: (cats) => SizedBox(
        height: 48,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          itemCount: cats.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (context, i) {
            final c = cats[i];
            return ActionChip(
              label: Text(c.name),
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => CategoryProductsScreen(category: c)),
              ),
            );
          },
        ),
      ),
      orElse: () => const SizedBox(height: 8),
    );
  }
}
