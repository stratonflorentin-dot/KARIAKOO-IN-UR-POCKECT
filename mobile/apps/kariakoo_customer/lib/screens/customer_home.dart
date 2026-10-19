import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

/// Customer home: the live catalog (featured products) from Supabase.
class CustomerHome extends ConsumerWidget {
  const CustomerHome({super.key, required this.session});

  final AppSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(featuredProductsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('KARIAKOO', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.2)),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            onPressed: () => ref.read(authRepositoryProvider).signOut(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(featuredProductsProvider.future),
        child: products.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => _ErrorView(message: 'Could not load the catalog.', detail: '$e'),
          data: (items) => items.isEmpty
              ? const _EmptyView()
              : GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.70,
                  ),
                  itemCount: items.length,
                  itemBuilder: (context, i) => _ProductCard(product: items[i]),
                ),
        ),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product});
  final Product product;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.line),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: product.imageUrl != null
                ? Image.network(
                    product.imageUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const _ImageFallback(),
                  )
                : const _ImageFallback(),
          ),
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
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ImageFallback extends StatelessWidget {
  const _ImageFallback();
  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.brand50,
      child: const Center(child: Icon(Icons.shopping_bag_outlined, color: AppColors.brand600, size: 40)),
    );
  }
}

class _EmptyView extends StatelessWidget {
  const _EmptyView();
  @override
  Widget build(BuildContext context) {
    return ListView(
      children: const [
        SizedBox(height: 120),
        Icon(Icons.storefront_outlined, size: 48, color: AppColors.muted),
        SizedBox(height: 12),
        Center(child: Text('No products in the catalog yet.')),
      ],
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.detail});
  final String message;
  final String detail;
  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const SizedBox(height: 120),
        const Icon(Icons.wifi_off, size: 48, color: AppColors.muted),
        const SizedBox(height: 12),
        Center(child: Text(message, style: const TextStyle(fontWeight: FontWeight.w600))),
        const SizedBox(height: 6),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Text(detail, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.muted, fontSize: 12)),
        ),
      ],
    );
  }
}
