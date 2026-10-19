class Product {
  const Product({
    required this.id,
    required this.shopId,
    required this.slug,
    required this.name,
    required this.category,
    required this.priceTzs,
    required this.stock,
    this.compareAtTzs,
    this.unit = 'piece',
    this.description = '',
    this.imageUrl,
    this.status = 'active',
    this.soldCount = 0,
  });

  final String id;
  final String shopId;
  final String slug;
  final String name;
  final String category;
  final int priceTzs;
  final int? compareAtTzs;
  final int stock;
  final String unit;
  final String description;
  final String? imageUrl;
  final String status; // active | archived
  final int soldCount;

  bool get inStock => stock > 0;
  bool get lowStock => stock > 0 && stock <= 5;

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as String,
        shopId: json['shop_id'] as String,
        slug: json['slug'] as String? ?? '',
        name: json['name'] as String,
        category: json['category'] as String,
        priceTzs: (json['price_tzs'] as num).toInt(),
        compareAtTzs: (json['compare_at_tzs'] as num?)?.toInt(),
        stock: (json['stock'] as num?)?.toInt() ?? 0,
        unit: json['unit'] as String? ?? 'piece',
        description: json['description'] as String? ?? '',
        imageUrl: json['image_url'] as String?,
        status: json['status'] as String? ?? 'active',
        soldCount: (json['sold_count'] as num?)?.toInt() ?? 0,
      );
}
