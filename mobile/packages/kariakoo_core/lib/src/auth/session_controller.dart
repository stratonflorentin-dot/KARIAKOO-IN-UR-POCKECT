import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/app_role.dart';
import '../models/app_session.dart';
import '../supabase/supabase_init.dart';
import 'auth_repository.dart';

final authRepositoryProvider =
    Provider<AuthRepository>((ref) => const AuthRepository());

/// Which role a multi-role user has chosen to act as. Not persisted in Phase 0;
/// defaults to the highest-priority role the user holds.
final preferredRoleProvider = StateProvider<AppRole?>((ref) => null);

/// The current session, rebuilt whenever auth state changes. Null when signed
/// out. This is the mobile twin of the web app's getSession().
final sessionProvider = StreamProvider<AppSession?>((ref) async* {
  final preferred = ref.watch(preferredRoleProvider);

  yield await _loadSession(preferred);
  await for (final _ in supabase.auth.onAuthStateChange) {
    yield await _loadSession(preferred);
  }
});

Future<AppSession?> _loadSession(AppRole? preferred) async {
  final user = supabase.auth.currentUser;
  if (user == null) return null;

  final roleRows =
      await supabase.from('user_roles').select('role').eq('user_id', user.id);
  final roles = <AppRole>{};
  for (final row in roleRows as List) {
    final r = AppRole.fromName(row['role'] as String?);
    if (r != null) roles.add(r);
  }
  final active = pickActiveRole(roles, preferred: preferred);
  if (active == null) return null;

  final results = await Future.wait([
    supabase.from('profiles').select('full_name').eq('id', user.id).limit(1),
    supabase.from('shops').select('id').eq('owner_id', user.id).limit(1),
    supabase.from('riders').select('id').eq('id', user.id).limit(1),
  ]);
  final profileRows = results[0] as List;
  final shopRows = results[1] as List;
  final riderRows = results[2] as List;

  final name = profileRows.isNotEmpty
      ? (profileRows.first['full_name'] as String?)?.trim() ?? ''
      : '';

  return AppSession(
    userId: user.id,
    email: user.email,
    displayName: name.isNotEmpty ? name : (user.email ?? 'KARIAKOO user'),
    roles: roles,
    activeRole: active,
    shopId: shopRows.isNotEmpty ? shopRows.first['id'] as String? : null,
    riderId: riderRows.isNotEmpty ? riderRows.first['id'] as String? : null,
  );
}
