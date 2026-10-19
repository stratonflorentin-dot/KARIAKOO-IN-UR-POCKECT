import 'package:flutter/material.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

/// Square product image with a branded fallback when there's no photo.
class ProductImageBox extends StatelessWidget {
  const ProductImageBox({super.key, required this.product, this.radius = 0});
  final Product product;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final image = product.imageUrl != null
        ? Image.network(product.imageUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const _Fallback())
        : const _Fallback();
    return AspectRatio(
      aspectRatio: 1,
      child: radius > 0 ? ClipRRect(borderRadius: BorderRadius.circular(radius), child: image) : image,
    );
  }
}

class _Fallback extends StatelessWidget {
  const _Fallback();
  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.brand50,
      child: const Center(child: Icon(Icons.shopping_bag_outlined, color: AppColors.brand600, size: 40)),
    );
  }
}

/// A tappable product card for grids and lists.
class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product, this.onTap});
  final Product product;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.line),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ProductImageBox(product: product),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    formatTzs(product.priceTzs),
                    style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.brand700),
                  ),
                  if (!product.inStock)
                    const Padding(
                      padding: EdgeInsets.only(top: 2),
                      child: Text('Out of stock', style: TextStyle(fontSize: 11, color: AppColors.danger)),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
