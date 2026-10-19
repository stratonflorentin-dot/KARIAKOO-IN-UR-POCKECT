class Category {
  const Category({required this.slug, required this.name, required this.nameSw, this.sortOrder = 0});

  final String slug;
  final String name;
  final String nameSw;
  final int sortOrder;

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        slug: json['slug'] as String,
        name: json['name'] as String,
        nameSw: json['name_sw'] as String? ?? json['name'] as String,
        sortOrder: (json['sort_order'] as num?)?.toInt() ?? 0,
      );
}
