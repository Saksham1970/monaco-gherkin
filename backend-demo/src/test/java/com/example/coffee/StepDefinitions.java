package com.example.coffee;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.When;
import io.cucumber.java.en.Then;
import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public class StepDefinitions {
    private CoffeeShop shop = new CoffeeShop();
    private Order lastOrder;

    @Given("the coffee shop is open")
    public void the_coffee_shop_is_open() {
        shop.open();
        System.out.println("LOG: Opening the Coffee Shop...");
    }

    @When("I order a {string} on {isoDate}")
    public void i_order_a_on(String type, LocalDate date) {
        Order order = new Order(type, date);
        shop.placeOrder(order);
        this.lastOrder = order;
        System.out.println("LOG: Order placed for " + type + " on " + date);
    }

    @When("I order a {size} {string} with {string}")
    public void i_order_a_size_type_with_addons(Order.Size size, String type, String addonsString) {
        java.util.List<String> addons = java.util.Arrays.stream(addonsString.split(","))
                .map(String::trim)
                .collect(java.util.stream.Collectors.toList());
        Order order = new Order(type, size, addons, LocalDate.now());
        shop.placeOrder(order);
        this.lastOrder = order;
        System.out.println("LOG: Custom order placed: " + size + " " + type + " with add-ons: " + addons);
    }

    @Then("the receipt should show {money}")
    public void the_receipt_should_show(BigDecimal expectedPrice) {
        System.out.println("LOG: Verifying price... Expected: " + expectedPrice + ", Actual: " + lastOrder.getPrice());
        assertEquals(expectedPrice, lastOrder.getPrice());
    }

    @Then("I wait {int} minutes")
    public void i_wait_minutes(int minutes) {
        System.out.println("LOG: Waiting " + minutes + " minutes (int)");
    }

    @Given("the temperature is {float} degrees")
    public void the_temperature_is_degrees(float temp) {
        System.out.println("LOG: Temperature is " + temp + " degrees (float)");
    }

    @Given("I use the word {word}")
    public void i_use_the_word(String word) {
        System.out.println("LOG: Word used: " + word + " (word)");
    }

    @Then("I have {byte} coins")
    public void i_have_coins(byte coins) {
        System.out.println("LOG: I have " + coins + " coins (byte)");
    }

    @Then("I count {short} sheep")
    public void i_count_sheep(short sheep) {
        System.out.println("LOG: Counting " + sheep + " sheep (short)");
    }

    @Then("the universe age is {long} years")
    public void the_universe_age_is_years(long years) {
        System.out.println("LOG: Universe age: " + years + " years (long)");
    }

    @Then("the value is {bigdecimal}")
    public void the_value_is(BigDecimal value) {
        System.out.println("LOG: Decimal Value: " + value + " (bigdecimal)");
    }

    @Then("the big integer is {biginteger}")
    public void the_big_integer_is(java.math.BigInteger value) {
        System.out.println("LOG: Big Integer: " + value + " (biginteger)");
    }

    @Then("the precise value is {double}")
    public void the_precise_value_is(double value) {
        System.out.println("LOG: Precise Value: " + value + " (double)");
    }
}
