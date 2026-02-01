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
}
