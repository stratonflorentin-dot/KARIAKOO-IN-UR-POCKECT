import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

import '../state/cart.dart';
import '../widgets/product_card.dart';

class ProductDetailScreen extends ConsumerWidget {
  const ProductDetailScreen({super.key, required this.product});
  final Product product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: Text(product.name, overflow: TextOverflow.ellipsis)),
      body: ListView(
        children: [
          ProductImageBox(product: product),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product.name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(formatTzs(product.priceTzs),
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.brand700)),
                const SizedBox(height: 8),
                _StockChip(product: product),
                if (product.description.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  const Text('Description', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  Text(product.description, style: const TextStyle(color: AppColors.muted, height: 1.5)),
                ],
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton.icon(
            onPressed: product.inStock
                ? () {
                    ref.read(cartProvider.notifier).add(product);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Added "${product.name}" to cart'), duration: const Duration(seconds: 1)),
                    );
                  }
                : null,
            icon: const Icon(Icons.add_shopping_cart),
            label: Text(product.inStock ? 'Add to cart' : 'Out of stock'),
          ),
        ),
      ),
    );
  }
}

class _StockChip extends StatelessWidget {
  const _StockChip({required this.product});
  final Product product;
  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (product) {
      _ when !product.inStock => ('Out of stock', AppColors.danger),
      _ when product.lowStock => ('Only ${product.stock} left', AppColors.warning),
      _ => ('In stock', AppColors.brand700),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12)),
    );
  }
}
