package com.example.coffee;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;

public class Order {
    private static final Map<String, BigDecimal> BASE_PRICES = Map.of(
            "latte", new BigDecimal("4.50"),
            "espresso", new BigDecimal("3.00"),
            "cappuccino", new BigDecimal("4.00"),
            "tea", new BigDecimal("2.50"));

    private static final BigDecimal DEFAULT_PRICE = new BigDecimal("2.00");
    private static final BigDecimal ADDON_PRICE = new BigDecimal("0.50");
    private static final BigDecimal MEDIUM_UPCHARGE = new BigDecimal("0.50");
    private static final BigDecimal LARGE_UPCHARGE = new BigDecimal("1.00");

    private final String type;
    private final Size size;
    private final List<String> addons;
    private final LocalDate date;
    private final BigDecimal price;

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
        BigDecimal base = BASE_PRICES.getOrDefault(type.toLowerCase(), DEFAULT_PRICE);

        base = switch (size) {
            case Large -> base.add(LARGE_UPCHARGE);
            case Medium -> base.add(MEDIUM_UPCHARGE);
            case Small -> base;
        };

        if (addons != null) {
            long addonCount = addons.stream()
                    .filter(addon -> !"None".equalsIgnoreCase(addon))
                    .count();
            base = base.add(ADDON_PRICE.multiply(BigDecimal.valueOf(addonCount)));
        }

        return base;
    }

    public BigDecimal getPrice() {
        return price;
    }
}
