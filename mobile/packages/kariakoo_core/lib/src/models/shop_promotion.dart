/// A seller's advertisement: a status post, an upcoming-product teaser, or
/// branding. (Mirrors the shop_promotions table.)
class ShopPromotion {
  const ShopPromotion({
    required this.id,
    required this.shopId,
    required this.kind,
    required this.createdAt,
    this.title,
    this.body,
    this.imageUrl,
    this.linkProductId,
    this.expiresAt,
    this.shopName,
  });

  final String id;
  final String shopId;
  final String kind; // status | teaser | branding
  final String? title;
  final String? body;
  final String? imageUrl;
  final String? linkProductId;
  final DateTime? expiresAt;
  final DateTime createdAt;

  /// Present when the row was read with the shop joined (customer feed).
  final String? shopName;

  String get kindLabel => switch (kind) {
        'teaser' => 'Coming soon',
        'branding' => 'About the shop',
        _ => 'Status',
      };

  factory ShopPromotion.fromJson(Map<String, dynamic> json) {
    final shops = json['shops'];
    return ShopPromotion(
      id: json['id'] as String,
      shopId: json['shop_id'] as String,
      kind: json['kind'] as String? ?? 'status',
      title: json['title'] as String?,
      body: json['body'] as String?,
      imageUrl: json['image_url'] as String?,
      linkProductId: json['link_product_id'] as String?,
      expiresAt: json['expires_at'] != null ? DateTime.tryParse(json['expires_at'] as String) : null,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
      shopName: shops is Map ? shops['name'] as String? : null,
    );
  }
}
