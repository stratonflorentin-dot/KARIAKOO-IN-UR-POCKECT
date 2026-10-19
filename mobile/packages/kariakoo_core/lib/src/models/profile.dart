class Profile {
  const Profile({required this.id, required this.fullName, this.phone});

  final String id;
  final String fullName;
  final String? phone;

  factory Profile.fromJson(Map<String, dynamic> json) => Profile(
        id: json['id'] as String,
        fullName: (json['full_name'] as String?)?.trim() ?? '',
        phone: json['phone'] as String?,
      );
}
