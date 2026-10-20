import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../supabase/supabase_init.dart';

/// Applying to become a seller or rider. These RPCs grant the role (as a
/// pending shop/rider) and create the record; an admin approves later.
class RolesRepository {
  const RolesRepository();

  Future<void> applyAsSeller({
    required String name,
    required String category,
    required String area,
    required String address,
  }) async {
    await supabase.rpc('apply_as_seller', params: {
      'p_name': name,
      'p_category': category,
      'p_area': area,
      'p_address': address,
    });
  }

  Future<void> applyAsRider({
    required String vehicle,
    required String plate,
    required String baseZone,
  }) async {
    await supabase.rpc('apply_as_rider', params: {
      'p_vehicle': vehicle,
      'p_plate': plate,
      'p_base_zone': baseZone,
    });
  }
}

final rolesRepositoryProvider = Provider<RolesRepository>((ref) => const RolesRepository());
