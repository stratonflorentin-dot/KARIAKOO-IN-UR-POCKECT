/// KARIAKOO shared core: Supabase, models, auth, repositories, theme, widgets.
library kariakoo_core;

export 'package:supabase_flutter/supabase_flutter.dart' show User, AuthState, AuthException;

export 'src/config/env.dart';
export 'src/supabase/supabase_init.dart';

export 'src/theme/app_colors.dart';
export 'src/theme/app_theme.dart';

export 'src/models/app_role.dart';
export 'src/models/app_session.dart';
export 'src/models/profile.dart';
export 'src/models/category.dart';
export 'src/models/shop.dart';
export 'src/models/product.dart';
export 'src/models/delivery_offer.dart';
export 'src/models/rider_delivery.dart';
export 'src/models/order.dart';

export 'src/auth/auth_repository.dart';
export 'src/auth/session_controller.dart';

export 'src/repositories/catalog_repository.dart';
export 'src/repositories/dispatch_repository.dart';
export 'src/repositories/orders_repository.dart';
export 'src/repositories/roles_repository.dart';
export 'src/repositories/seller_repository.dart';

export 'src/util/format.dart';

export 'src/screens/auth_screen.dart';
export 'src/widgets/auth_gate.dart';
export 'src/widgets/gold_button.dart';
