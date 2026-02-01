package com.example.coffee;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Collections;

public class Order {
    private String type;
    private Size size;
    private List<String> addons;
    private LocalDate date;
    private BigDecimal price;

    public enum Size {
        Small, Medium, Large
    }

    public Order(String type, LocalDate date) {
        this(type, Size.Small, Collections.emptyList(), date);
    }

    public Order(String type, Size size, List<String> addons, LocalDate date) {
        this.type = type;
        this.size = size;
        this.addons = addons;
        this.date = date;
        this.price = calculatePrice();
    }

    private BigDecimal calculatePrice() {
        BigDecimal base = new BigDecimal("2.00");
        if ("Latte".equalsIgnoreCase(type)) base = new BigDecimal("4.50");
        else if ("Espresso".equalsIgnoreCase(type)) base = new BigDecimal("3.00");
        else if ("Cappuccino".equalsIgnoreCase(type)) base = new BigDecimal("4.00");
        else if ("Tea".equalsIgnoreCase(type)) base = new BigDecimal("2.50");

        // Size adjustment
        if (size == Size.Large) base = base.add(new BigDecimal("1.00"));
        if (size == Size.Medium) base = base.add(new BigDecimal("0.50"));
        // Small is base price (or subtract, but keeping simple)

        // Add-ons
        if (addons != null) {
            for (String addon : addons) {
                if ("None".equalsIgnoreCase(addon)) continue;
                base = base.add(new BigDecimal("0.50")); // 50c per add-on
            }
        }

        return base;
    }

    public BigDecimal getPrice() {
        return price;
    }
}
