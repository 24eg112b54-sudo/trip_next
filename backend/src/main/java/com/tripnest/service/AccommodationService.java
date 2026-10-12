package com.tripnest.service;

import com.tripnest.dto.ApiDtos.*;
import com.tripnest.entity.*;
import com.tripnest.exception.ApiException;
import com.tripnest.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;

@Service
public class AccommodationService {
    private final AccommodationRepository repo;
    private final AmenityRepository amenities;
    private final BookingRepository bookings;

    public AccommodationService(AccommodationRepository repo, AmenityRepository amenities, BookingRepository bookings) {
        this.repo = repo; this.amenities = amenities; this.bookings = bookings;
    }

    @Transactional(readOnly = true)
    public List<AccommodationView> list(String q, String type, String amenity, String sort, BigDecimal minPrice,
                                         BigDecimal maxPrice, BigDecimal minRating, int offset, int limit) {
        if (offset < 0 || limit < 1 || limit > 100) throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid pagination values.");
        if (minPrice != null && minPrice.signum() < 0 || maxPrice != null && maxPrice.signum() < 0) throw new ApiException(HttpStatus.BAD_REQUEST, "Prices cannot be negative.");
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) throw new ApiException(HttpStatus.BAD_REQUEST, "Minimum price cannot exceed maximum price.");
        if (minRating != null && (minRating.signum() < 0 || minRating.compareTo(new BigDecimal("5.0")) > 0)) throw new ApiException(HttpStatus.BAD_REQUEST, "Rating must be between 0 and 5.");
        String query = q == null ? "" : q.trim().toLowerCase();
        String requestedType = type == null ? "" : type.trim().toLowerCase();
        String requestedAmenity = amenity == null ? "" : amenity.trim().toLowerCase();
        Comparator<Accommodation> comparator = switch (sort == null ? "rating" : sort) {
            case "priceAsc" -> Comparator.comparing(Accommodation::getPricePerNight);
            case "priceDesc" -> Comparator.comparing(Accommodation::getPricePerNight).reversed();
            case "name" -> Comparator.comparing(a -> a.getName().toLowerCase());
            default -> Comparator.comparing(Accommodation::getRating).reversed().thenComparing(Accommodation::getName);
        };
        return repo.findByActiveTrueOrderByRatingDesc().stream()
                .filter(a -> query.isBlank() || (a.getName() + " " + a.getCity() + " " + a.getCountry() + " " + a.getShortDescription()).toLowerCase().contains(query))
                .filter(a -> requestedType.isBlank() || a.getType().equalsIgnoreCase(requestedType))
                .filter(a -> requestedAmenity.isBlank() || a.getAmenities().stream().anyMatch(x -> x.getName().toLowerCase().contains(requestedAmenity)))
                .filter(a -> minPrice == null || a.getPricePerNight().compareTo(minPrice) >= 0)
                .filter(a -> maxPrice == null || a.getPricePerNight().compareTo(maxPrice) <= 0)
                .filter(a -> minRating == null || a.getRating().compareTo(minRating) >= 0)
                .sorted(comparator)
                .skip(offset).limit(limit).map(this::view).toList();
    }

    public List<AccommodationView> list(String q) { return list(q, null, null, null, null, null, null, 0, 50); }

    @Transactional(readOnly = true)
    public AccommodationView get(Long id) { return view(repo.findByIdAndActiveTrue(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Accommodation not found."))); }

    @Transactional(readOnly = true)
    public List<AccommodationView> adminList() { return repo.findAll().stream().map(this::view).toList(); }

    @Transactional
    public AccommodationView create(AccommodationRequest x) { Accommodation a = new Accommodation(); apply(a, x); return view(repo.save(a)); }

    @Transactional
    public AccommodationView update(Long id, AccommodationRequest x) { Accommodation a = repo.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Accommodation not found.")); apply(a, x); a.setActive(true); return view(repo.save(a)); }

    @Transactional
    public void remove(Long id) { Accommodation a = repo.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Accommodation not found.")); if (bookings.existsByAccommodationId(id)) throw new ApiException(HttpStatus.CONFLICT, "This stay has bookings and cannot be deleted. Deactivate it instead."); a.setActive(false); repo.save(a); }

    private void apply(Accommodation a, AccommodationRequest x) {
        a.setName(x.name().trim()); a.setType(x.type().trim().toUpperCase()); a.setCity(x.city().trim()); a.setCountry(x.country().trim()); a.setAddress(x.address().trim()); a.setShortDescription(x.shortDescription().trim()); a.setDescription(x.description().trim()); a.setPricePerNight(x.pricePerNight()); a.setMaxGuests(x.maxGuests()); a.setRating(x.rating() == null ? BigDecimal.ZERO : x.rating());
        a.getImages().clear(); if (x.images() != null) x.images().stream().filter(Objects::nonNull).map(String::trim).filter(s -> !s.isBlank()).limit(10).forEach(url -> { AccommodationImage image = new AccommodationImage(); image.setUrl(url); image.setSortOrder(a.getImages().size()); a.getImages().add(image); });
        a.getAmenities().clear(); if (x.amenities() != null) x.amenities().stream().filter(Objects::nonNull).map(String::trim).filter(s -> !s.isBlank()).map(n -> amenities.findByNameIgnoreCase(n).orElseGet(() -> { Amenity z = new Amenity(); z.setName(n); return amenities.save(z); })).forEach(a.getAmenities()::add);
    }

    public AccommodationView view(Accommodation a) { return new AccommodationView(a.getId(), a.getName(), a.getType(), a.getCity(), a.getCountry(), a.getAddress(), a.getShortDescription(), a.getDescription(), a.getPricePerNight(), a.getMaxGuests(), a.getRating(), a.getImages().stream().sorted(Comparator.comparing(AccommodationImage::getSortOrder)).map(AccommodationImage::getUrl).toList(), a.getAmenities().stream().map(Amenity::getName).sorted().toList(), a.isActive()); }
}
