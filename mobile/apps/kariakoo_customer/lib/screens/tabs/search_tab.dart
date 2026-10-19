import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

import '../../widgets/product_card.dart';
import '../product_detail.dart';

class SearchTab extends ConsumerStatefulWidget {
  const SearchTab({super.key});
  @override
  ConsumerState<SearchTab> createState() => _SearchTabState();
}

class _SearchTabState extends ConsumerState<SearchTab> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final products = ref.watch(featuredProductsProvider);
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          autofocus: false,
          decoration: const InputDecoration(
            hintText: 'Search products',
            border: InputBorder.none,
            prefixIcon: Icon(Icons.search),
          ),
          onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
        ),
      ),
      body: products.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => const Center(child: Text('Could not load products.')),
        data: (items) {
          final filtered = _query.isEmpty
              ? items
              : items.where((p) => p.name.toLowerCase().contains(_query)).toList();
          if (filtered.isEmpty) {
            return Center(
              child: Text(_query.isEmpty ? 'Start typing to search.' : 'No products match "$_query".'),
            );
          }
          return GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 0.70,
            ),
            itemCount: filtered.length,
            itemBuilder: (context, i) {
              final p = filtered[i];
              return ProductCard(
                product: p,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => ProductDetailScreen(product: p)),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
