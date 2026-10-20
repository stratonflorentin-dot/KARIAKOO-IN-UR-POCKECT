import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/shop_promotion.dart';
import '../supabase/supabase_init.dart';

/// Seller advertisements. RLS lets a seller manage only their own; the public
/// feed returns only live promotions from approved shops.
class PromotionsRepository {
  const PromotionsRepository();

  /// A shop's own promotions (including expired ones) — for the seller.
  Future<List<ShopPromotion>> myPromotions(String shopId) async {
    final rows = await supabase
        .from('shop_promotions')
        .select()
        .eq('shop_id', shopId)
        .order('created_at', ascending: false);
    return (rows as List).map((e) => ShopPromotion.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Live promotions across all approved shops — for the customer feed.
  Future<List<ShopPromotion>> livePromotions() async {
    final rows = await supabase
        .from('shop_promotions')
        .select('id,shop_id,kind,title,body,image_url,link_product_id,expires_at,created_at,shops(name)')
        .order('created_at', ascending: false)
        .limit(50);
    return (rows as List).map((e) => ShopPromotion.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createPromotion({
    required String shopId,
    required String kind,
    String? title,
    String? body,
    String? imageUrl,
    DateTime? expiresAt,
  }) async {
    await supabase.from('shop_promotions').insert({
      'shop_id': shopId,
      'kind': kind,
      'title': title,
      'body': body,
      'image_url': imageUrl,
      'expires_at': expiresAt?.toIso8601String(),
    });
  }

  Future<void> deletePromotion(String id) async {
    await supabase.from('shop_promotions').delete().eq('id', id);
  }
}

final promotionsRepositoryProvider = Provider<PromotionsRepository>((ref) => const PromotionsRepository());

final myPromotionsProvider =
    FutureProvider.autoDispose.family<List<ShopPromotion>, String>((ref, shopId) {
  return ref.read(promotionsRepositoryProvider).myPromotions(shopId);
});

final livePromotionsProvider = FutureProvider.autoDispose<List<ShopPromotion>>((ref) {
  return ref.read(promotionsRepositoryProvider).livePromotions();
});
