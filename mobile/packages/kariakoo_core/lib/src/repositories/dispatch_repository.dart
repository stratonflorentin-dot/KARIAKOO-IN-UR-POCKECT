import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/delivery_offer.dart';
import '../models/rider_delivery.dart';
import '../supabase/supabase_init.dart';

/// Wraps the Phase 6 rider-dispatch RPCs and reads. Riders only ever change
/// state through these SECURITY DEFINER functions — the tables have no write
/// policies — so the server enforces the state machine.
class DispatchRepository {
  const DispatchRepository();

  /// Go online/offline and (optionally) report the rider's real GPS fix.
  Future<void> setPresence(
      {required bool online, double? lng, double? lat}) async {
    await supabase.rpc('rider_set_presence', params: {
      'p_online': online,
      'p_lng': lng,
      'p_lat': lat,
    });
  }

  /// The caller's live offers (RLS already scopes to this rider).
  Future<List<DeliveryOffer>> myOffers() async {
    // This also recovers orders that were placed while this rider was offline
    // and requeues offers that expired without being accepted.
    await supabase.rpc('rider_refresh_offers');
    final rows = await supabase
        .from('delivery_offers')
        .select('id,order_id,rider_id,payout_tzs,status,offered_at,expires_at')
        .eq('status', 'pending')
        .gt('expires_at', DateTime.now().toUtc().toIso8601String())
        .order('offered_at', ascending: false);
    return (rows as List)
        .map((e) => DeliveryOffer.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<String> acceptOffer(String orderId) async {
    final res =
        await supabase.rpc('rider_accept_offer', params: {'p_order': orderId});
    return res is String ? res : 'ACCEPTED';
  }

  Future<void> declineOffer(String orderId) async {
    await supabase.rpc('rider_decline_offer', params: {'p_order': orderId});
  }

  /// Move an accepted job forward: PICKED_UP or IN_TRANSIT.
  Future<String> advance(String orderId, String to) async {
    final res = await supabase.rpc('rider_advance_delivery',
        params: {'p_order': orderId, 'p_to': to});
    return res is String ? res : to;
  }

  /// Finish an in-transit delivery by entering the customer's PIN.
  Future<String> completeDelivery(String orderId, String pin) async {
    final res = await supabase.rpc('rider_complete_delivery',
        params: {'p_order': orderId, 'p_pin': pin});
    return res is String ? res : 'DELIVERED';
  }

  /// The rider's current in-progress delivery, if any.
  Future<RiderDelivery?> activeDelivery(String riderId) async {
    final rows = await supabase
        .from('deliveries')
        .select('order_id,rider_id,status,rider_payout_tzs')
        .eq('rider_id', riderId)
        .inFilter('status', ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT']).limit(1);
    final list = rows as List;
    return list.isEmpty
        ? null
        : RiderDelivery.fromJson(list.first as Map<String, dynamic>);
  }
}

final dispatchRepositoryProvider =
    Provider<DispatchRepository>((ref) => const DispatchRepository());

final myOffersProvider = FutureProvider.autoDispose<List<DeliveryOffer>>((ref) {
  return ref.read(dispatchRepositoryProvider).myOffers();
});

final activeDeliveryProvider =
    FutureProvider.autoDispose.family<RiderDelivery?, String>((ref, riderId) {
  return ref.read(dispatchRepositoryProvider).activeDelivery(riderId);
});
