import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/product.dart';
import '../models/shop.dart';
import '../supabase/supabase_init.dart';

/// Seller-owned reads and writes. RLS lets an owner read and change only their
/// own shop's products; these calls carry no special privilege beyond that.
class SellerRepository {
  const SellerRepository();

  Future<Shop?> myShop() async {
    final uid = supabase.auth.currentUser?.id;
    if (uid == null) return null;
    final rows = await supabase.from('shops').select().eq('owner_id', uid).limit(1);
    final list = rows as List;
    return list.isEmpty ? null : Shop.fromJson(list.first as Map<String, dynamic>);
  }

  Future<List<Product>> myProducts(String shopId) async {
    final rows = await supabase
        .from('products')
        .select()
        .eq('shop_id', shopId)
        .order('created_at', ascending: false);
    return (rows as List).map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> setShopLocation({required double lat, required double lng}) async {
    await supabase.rpc('seller_set_shop_location', params: {
      'p_lat': lat,
      'p_lng': lng,
    });
  }

  Future<void> addProduct({
    required String shopId,
    required String name,
    required String category,
    required int priceTzs,
    required int stock,
    String description = '',
  }) async {
    await supabase.from('products').insert({
      'shop_id': shopId,
      'slug': _slug(name),
      'name': name,
      'category': category,
      'price_tzs': priceTzs,
      'stock': stock,
      'description': description,
    });
  }

  Future<void> updateProduct(String id, {int? priceTzs, int? stock, String? status}) async {
    final patch = <String, dynamic>{};
    if (priceTzs != null) patch['price_tzs'] = priceTzs;
    if (stock != null) patch['stock'] = stock;
    if (status != null) patch['status'] = status;
    if (patch.isEmpty) return;
    await supabase.from('products').update(patch).eq('id', id);
  }

  /// A unique, DB-valid slug (`^[a-z0-9-]{3,120}$`) from the product name.
  String _slug(String name) {
    final base = name
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'(^-+)|(-+$)'), '');
    final stem = base.isEmpty ? 'item' : base;
    final suffix = (Random().nextInt(900000) + 100000).toString();
    final slug = '$stem-$suffix';
    return slug.length > 120 ? slug.substring(0, 120) : slug;
  }
}

final sellerRepositoryProvider = Provider<SellerRepository>((ref) => const SellerRepository());

final myShopProvider = FutureProvider.autoDispose<Shop?>((ref) {
  return ref.read(sellerRepositoryProvider).myShop();
});

final myProductsProvider =
    FutureProvider.autoDispose.family<List<Product>, String>((ref, shopId) {
  return ref.read(sellerRepositoryProvider).myProducts(shopId);
});
