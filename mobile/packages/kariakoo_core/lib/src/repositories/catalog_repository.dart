import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/category.dart';
import '../models/product.dart';
import '../models/shop.dart';
import '../supabase/supabase_init.dart';

/// Reads the public catalog. RLS returns only approved shops and active
/// products to the anon/authenticated roles, so no extra filtering is needed
/// for safety — the `.eq` calls below are just for the common case.
class CatalogRepository {
  const CatalogRepository();

  Future<List<Category>> categories() async {
    final rows = await supabase.from('categories').select().order('sort_order');
    return (rows as List).map((e) => Category.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Shop>> shops() async {
    final rows = await supabase.from('shops').select().eq('status', 'approved');
    return (rows as List).map((e) => Shop.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Product>> products({String? category}) async {
    final query = supabase.from('products').select().eq('status', 'active');
    final rows = category == null
        ? await query.order('sold_count', ascending: false)
        : await query.eq('category', category).order('sold_count', ascending: false);
    return (rows as List).map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Product>> productsForShop(String shopId) async {
    final rows = await supabase.from('products').select().eq('shop_id', shopId);
    return (rows as List).map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
  }
}

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) => const CatalogRepository());

final categoriesProvider = FutureProvider<List<Category>>((ref) {
  return ref.read(catalogRepositoryProvider).categories();
});

final shopsProvider = FutureProvider<List<Shop>>((ref) {
  return ref.read(catalogRepositoryProvider).shops();
});

final featuredProductsProvider = FutureProvider<List<Product>>((ref) {
  return ref.read(catalogRepositoryProvider).products();
});
