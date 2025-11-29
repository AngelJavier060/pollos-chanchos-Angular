// Widget test básico para Granja Elviata
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_granjaelvita/main.dart';

void main() {
  testWidgets('App loads correctly', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const GranjaElviataApp());

    // Verify the app loads (login page shows fingerprint button)
    expect(find.text('Huella'), findsOneWidget);
  });
}
