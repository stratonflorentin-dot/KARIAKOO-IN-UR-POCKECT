import 'app_role.dart';

/// The signed-in user as the apps see them: who they are, every role they hold,
/// and which role is currently active (for people who are both, say, a customer
/// and a seller).
class AppSession {
  const AppSession({
    required this.userId,
    required this.email,
    required this.displayName,
    required this.roles,
    required this.activeRole,
    this.shopId,
    this.riderId,
  });

  final String userId;
  final String? email;
  final String displayName;
  final Set<AppRole> roles;
  final AppRole activeRole;

  /// The shop this user owns, if any (seller scoping).
  final String? shopId;

  /// The rider row id, if this user is a rider.
  final String? riderId;

  bool hasRole(AppRole role) => roles.contains(role);

  /// This user's uid also serves as their customer id (orders.customer_id).
  String get customerId => userId;
}
