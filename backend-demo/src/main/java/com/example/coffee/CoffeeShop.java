package com.example.coffee;

import java.util.ArrayList;
import java.util.List;

public class CoffeeShop {
    private List<Order> orders = new ArrayList<>();
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

    public Order getLastOrder() {
        if (orders.isEmpty()) return null;
        return orders.get(orders.size() - 1);
    }
}
