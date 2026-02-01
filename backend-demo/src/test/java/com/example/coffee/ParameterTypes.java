package com.example.coffee;

import io.cucumber.java.ParameterType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public class ParameterTypes {

    @ParameterType("\\d{4}-\\d{2}-\\d{2}")
    public LocalDate isoDate(String date) {
        return LocalDate.parse(date);
    }

    @ParameterType("\\$(\\d+\\.\\d{2})")
    public BigDecimal money(String amount) {
        return new BigDecimal(amount);
    }

    @ParameterType("Small|Medium|Large")
    public Order.Size size(String size) {
        return Order.Size.valueOf(size);
    }


}
