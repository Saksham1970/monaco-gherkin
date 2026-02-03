package com.example.coffee;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class CoffeeShop {
    private final List<Order> orders = new ArrayList<>();
    private boolean isOpen = false;

    public void open() {
        this.isOpen = true;
    }

    public void placeOrder(Order order) {
        if (!isOpen) {
            throw new IllegalStateException("Shop is closed!");
        }
        orders.add(order);
    }

    public Optional<Order> getLastOrder() {
        return orders.isEmpty() ? Optional.empty() : Optional.of(orders.get(orders.size() - 1));
    }
}
