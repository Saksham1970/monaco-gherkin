package com.example.coffee;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.When;
import io.cucumber.java.en.Then;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class StepDefinitions {
    private final CoffeeShop shop = new CoffeeShop();
    private Order lastOrder;

    @Given("the coffee shop is open")
    public void the_coffee_shop_is_open() {
        shop.open();
        log("Opening the Coffee Shop...");
    }

    @When("I order a {string} on {isoDate}")
    public void i_order_a_on(String type, LocalDate date) {
        Order order = new Order(type, date);
        shop.placeOrder(order);
        this.lastOrder = order;
        log("Order placed for " + type + " on " + date);
    }

    @When("I order a {size} {string} with {string}")
    public void i_order_a_size_type_with_addons(Order.Size size, String type, String addonsString) {
        List<String> addons = Arrays.stream(addonsString.split(","))
                .map(String::trim)
                .collect(Collectors.toList());
        Order order = new Order(type, size, addons, LocalDate.now());
        shop.placeOrder(order);
        this.lastOrder = order;
        log("Custom order placed: " + size + " " + type + " with add-ons: " + addons);
    }

    @Then("the receipt should show {money}")
    public void the_receipt_should_show(BigDecimal expectedPrice) {
        log("Verifying price... Expected: " + expectedPrice + ", Actual: " + lastOrder.getPrice());
        assertEquals(expectedPrice, lastOrder.getPrice());
    }

    @Then("I wait {int} minutes")
    public void i_wait_minutes(int minutes) {
        log("Waiting " + minutes + " minutes (int)");
    }

    @Given("the temperature is {float} degrees")
    public void the_temperature_is_degrees(float temp) {
        log("Temperature is " + temp + " degrees (float)");
    }

    @Given("I use the word {word}")
    public void i_use_the_word(String word) {
        log("Word used: " + word + " (word)");
    }

    @Then("I have {byte} coins")
    public void i_have_coins(byte coins) {
        log("I have " + coins + " coins (byte)");
    }

    @Then("I count {short} sheep")
    public void i_count_sheep(short sheep) {
        log("Counting " + sheep + " sheep (short)");
    }

    @Then("the universe age is {long} years")
    public void the_universe_age_is_years(long years) {
        log("Universe age: " + years + " years (long)");
    }

    @Then("the value is {bigdecimal}")
    public void the_value_is(BigDecimal value) {
        log("Decimal Value: " + value + " (bigdecimal)");
    }

    @Then("the big integer is {biginteger}")
    public void the_big_integer_is(BigInteger value) {
        log("Big Integer: " + value + " (biginteger)");
    }

    @Then("the precise value is {double}")
    public void the_precise_value_is(double value) {
        log("Precise Value: " + value + " (double)");
    }

    private void log(String message) {
        System.out.println("LOG: " + message);
    }
}
