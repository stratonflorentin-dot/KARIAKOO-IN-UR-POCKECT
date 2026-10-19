import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

/// One line in the cart: a product and how many.
class CartLine {
  const CartLine({required this.product, required this.quantity});
  final Product product;
  final int quantity;

  int get lineTotalTzs => product.priceTzs * quantity;
  CartLine copyWith({int? quantity}) => CartLine(product: product, quantity: quantity ?? this.quantity);
}

/// In-memory cart for this session. (Orders are not written to the DB yet —
/// that is a later backend phase — so checkout is a preview for now.)
class CartController extends Notifier<List<CartLine>> {
  @override
  List<CartLine> build() => const [];

  void add(Product product) {
    final i = state.indexWhere((l) => l.product.id == product.id);
    if (i >= 0) {
      final next = [...state];
      next[i] = next[i].copyWith(quantity: next[i].quantity + 1);
      state = next;
    } else {
      state = [...state, CartLine(product: product, quantity: 1)];
    }
  }

  void setQuantity(String productId, int quantity) {
    if (quantity <= 0) {
      remove(productId);
      return;
    }
    state = [
      for (final l in state) if (l.product.id == productId) l.copyWith(quantity: quantity) else l,
    ];
  }

  void remove(String productId) {
    state = state.where((l) => l.product.id != productId).toList();
  }

  void clear() => state = const [];
}

final cartProvider = NotifierProvider<CartController, List<CartLine>>(CartController.new);

final cartCountProvider = Provider<int>((ref) {
  return ref.watch(cartProvider).fold(0, (sum, l) => sum + l.quantity);
});

final cartTotalProvider = Provider<int>((ref) {
  return ref.watch(cartProvider).fold(0, (sum, l) => sum + l.lineTotalTzs);
});
