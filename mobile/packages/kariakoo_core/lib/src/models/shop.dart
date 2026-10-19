class Shop {
  const Shop({
    required this.id,
    required this.slug,
    required this.name,
    required this.primaryCategory,
    required this.area,
    required this.address,
    required this.status,
    this.verified = false,
    this.rating = 0,
    this.reviewCount = 0,
    this.lat,
    this.lng,
  });

  final String id;
  final String slug;
  final String name;
  final String primaryCategory;
  final String area;
  final String address;
  final String status; // pending | approved | rejected | suspended
  final bool verified;
  final double rating;
  final int reviewCount;
  final double? lat;
  final double? lng;

  factory Shop.fromJson(Map<String, dynamic> json) => Shop(
        id: json['id'] as String,
        slug: json['slug'] as String,
        name: json['name'] as String,
        primaryCategory: json['primary_category'] as String,
        area: json['area'] as String? ?? 'kariakoo',
        address: json['address'] as String? ?? '',
        status: json['status'] as String? ?? 'approved',
        verified: json['verified'] as bool? ?? false,
        rating: (json['rating'] as num?)?.toDouble() ?? 0,
        reviewCount: (json['review_count'] as num?)?.toInt() ?? 0,
        lat: (json['lat'] as num?)?.toDouble(),
        lng: (json['lng'] as num?)?.toDouble(),
      );
}
