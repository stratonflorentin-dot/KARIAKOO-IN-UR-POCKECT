/// The roles a user can hold (mirrors the DB `app_role` enum).
enum AppRole {
  customer,
  seller,
  rider,
  admin;

  static AppRole? fromName(String? value) {
    for (final r in AppRole.values) {
      if (r.name == value) return r;
    }
    return null;
  }

  String get label => switch (this) {
        AppRole.customer => 'Customer',
        AppRole.seller => 'Seller',
        AppRole.rider => 'Rider',
        AppRole.admin => 'Admin',
      };
}

/// When a user holds several roles, this order picks the default active one.
const List<AppRole> rolePriority = [
  AppRole.admin,
  AppRole.seller,
  AppRole.rider,
  AppRole.customer,
];

AppRole? pickActiveRole(Set<AppRole> roles, {AppRole? preferred}) {
  if (roles.isEmpty) return null;
  if (preferred != null && roles.contains(preferred)) return preferred;
  for (final r in rolePriority) {
    if (roles.contains(r)) return r;
  }
  return roles.first;
}
