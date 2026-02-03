Feature: Standard Parameter Types Verification

  Scenario: Use all standard parameter types
    Given the coffee shop is open
    Then I wait 5 minutes
    And the temperature is 98.6 degrees
    And I use the word Hello
    Then I have 127 coins
    And I count 30000 sheep
    And the universe age is 13700000000 years
    And the value is 123.456789
    And the big integer is 12345678901234567890
    And the precise value is 3.14159265359
