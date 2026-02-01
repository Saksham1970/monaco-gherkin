Feature: Custom Coffee Orders

  Scenario: Order a large latte with extras
    Given the coffee shop is open
    When I order a Large "Latte" with "Milk, Sugar"
    Then the receipt should show $6.50

  Scenario: Order a small espresso
    Given the coffee shop is open
    When I order a Small "Espresso" with "None"
    Then the receipt should show $3.00

  Scenario Outline: Ordering various drinks
    Given the coffee shop is open
    When I order a <size> "<type>" with "<addons>"
    Then the receipt should show <price>

    Examples:
      | size   | type       | addons      | price |
      | Medium | Cappuccino | Cocoa       | $5.00 |
      | Large  | Tea        | Lemon,Honey | $4.50 |
