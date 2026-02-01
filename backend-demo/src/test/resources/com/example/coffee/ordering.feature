Feature: Order Coffee

  Scenario: Order a standard coffee
    Given the coffee shop is open
    When I order a "Latte" on 2024-05-20
    Then the receipt should show $4.50

  Scenario: Order a cheap coffee
    Given the coffee shop is open
    When I order a "Regular" on 2024-05-21
    Then the receipt should show $2.00
