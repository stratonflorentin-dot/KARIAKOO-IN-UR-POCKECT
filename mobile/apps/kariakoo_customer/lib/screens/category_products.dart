import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

import '../widgets/product_card.dart';
import 'product_detail.dart';

final _categoryProductsProvider = FutureProvider.family<List<Product>, String>((ref, slug) {
  return ref.read(catalogRepositoryProvider).products(category: slug);
});

class CategoryProductsScreen extends ConsumerWidget {
  const CategoryProductsScreen({super.key, required this.category});
  final Category category;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(_categoryProductsProvider(category.slug));
    return Scaffold(
      appBar: AppBar(title: Text(category.name)),
      body: products.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => const Center(child: Text('Could not load this category.')),
        data: (items) => items.isEmpty
            ? const Center(child: Text('Nothing here yet.'))
            : GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 0.70,
                ),
                itemCount: items.length,
                itemBuilder: (context, i) {
                  final p = items[i];
                  return ProductCard(
                    product: p,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => ProductDetailScreen(product: p)),
                    ),
                  );
                },
              ),
      ),
    );
  }
}
