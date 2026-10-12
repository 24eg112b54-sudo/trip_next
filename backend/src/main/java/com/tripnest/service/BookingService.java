package com.tripnest.service;

import com.tripnest.dto.ApiDtos.*;
import com.tripnest.entity.*;
import com.tripnest.exception.ApiException;
import com.tripnest.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.*; import java.time.*; import java.util.*;

@Service
public class BookingService {
    private static final BigDecimal TAX_RATE = new BigDecimal("0.12");
    private final BookingRepository bookings; private final AccommodationRepository accommodations; private final UserRepository users;
    public BookingService(BookingRepository b, AccommodationRepository a, UserRepository u){bookings=b;accommodations=a;users=u;}

    @Transactional
    public BookingView create(String email, Long accommodationId, BookingRequest request) {
        if (!request.checkOut().isAfter(request.checkIn())) throw new ApiException(HttpStatus.BAD_REQUEST,"Check-out must be after check-in.");
        Accommodation accommodation=accommodations.lockActive(accommodationId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Accommodation not found."));
        if(request.guests()>accommodation.getMaxGuests()) throw new ApiException(HttpStatus.BAD_REQUEST,"This stay cannot host that many guests.");
        if(bookings.overlap(accommodationId,request.checkIn(),request.checkOut())>0) throw new ApiException(HttpStatus.CONFLICT,"Those dates are no longer available.");
        User user=users.findByEmail(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Please sign in again."));
        int nights=(int)java.time.temporal.ChronoUnit.DAYS.between(request.checkIn(),request.checkOut());
        BigDecimal subtotal=accommodation.getPricePerNight().multiply(BigDecimal.valueOf(nights));
        BigDecimal tax=subtotal.multiply(TAX_RATE).setScale(2,RoundingMode.HALF_UP);
        Booking booking=new Booking(); booking.setReference("TN-"+UUID.randomUUID().toString().replace("-","").substring(0,10).toUpperCase()); booking.setUser(user); booking.setAccommodation(accommodation); booking.setCheckIn(request.checkIn()); booking.setCheckOut(request.checkOut()); booking.setGuests(request.guests()); booking.setNights(nights); booking.setPricePerNight(accommodation.getPricePerNight()); booking.setTaxAmount(tax); booking.setTotalAmount(subtotal.add(tax).setScale(2,RoundingMode.HALF_UP)); booking.setStatus(BookingStatus.CONFIRMED);
        return view(bookings.save(booking));
    }
    @Transactional(readOnly=true) public List<BookingView> mine(String email){return bookings.byUser(users.findByEmail(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Please sign in again.")).getId()).stream().map(this::view).toList();}
    @Transactional public void cancel(String email,String reference){Booking b=bookings.findByReference(reference).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Booking not found."));if(!b.getUser().getEmail().equals(email))throw new ApiException(HttpStatus.FORBIDDEN,"You cannot change this booking.");if(b.getStatus()!=BookingStatus.CONFIRMED)throw new ApiException(HttpStatus.BAD_REQUEST,"This booking cannot be cancelled.");b.setStatus(BookingStatus.CANCELLED);bookings.save(b);}
    @Transactional public BookingView setStatus(String reference,BookingStatus next){Booking b=bookings.findByReference(reference).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Booking not found."));if(b.getStatus()==BookingStatus.CANCELLED&&next==BookingStatus.CONFIRMED)throw new ApiException(HttpStatus.BAD_REQUEST,"Cancelled bookings cannot be reactivated.");b.setStatus(next);return view(bookings.save(b));}
    @Transactional(readOnly=true) public List<BookingView> all(){return bookings.allDetailed().stream().map(this::view).toList();}
    private BookingView view(Booking b){return new BookingView(b.getReference(),b.getAccommodation().getName(),b.getAccommodation().getId(),b.getCheckIn(),b.getCheckOut(),b.getGuests(),b.getNights(),b.getPricePerNight(),b.getTaxAmount(),b.getTotalAmount(),b.getStatus().name());}
}
