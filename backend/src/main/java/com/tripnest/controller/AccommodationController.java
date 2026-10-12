package com.tripnest.controller;

import com.tripnest.dto.ApiDtos.AccommodationView;
import com.tripnest.service.AccommodationService;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping({"/api/accommodations", "/api/properties"})
public class AccommodationController {
    private final AccommodationService service;

    public AccommodationController(AccommodationService service) { this.service = service; }

    @GetMapping
    public List<AccommodationView> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String amenity,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) java.math.BigDecimal minPrice,
            @RequestParam(required = false) java.math.BigDecimal maxPrice,
            @RequestParam(required = false) java.math.BigDecimal minRating,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "50") int limit) {
        return service.list(q, type, amenity, sort, minPrice, maxPrice, minRating, offset, limit);
    }

    @GetMapping("/{id}")
    public AccommodationView get(@PathVariable Long id) { return service.get(id); }
}
