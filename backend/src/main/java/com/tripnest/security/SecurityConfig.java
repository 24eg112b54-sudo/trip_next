package com.tripnest.security;

import com.tripnest.repository.UserRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.*;

@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean UserDetailsService userDetailsService(UserRepository users) {
        return username -> users.findByEmail(username)
                .map(u -> User.withUsername(u.getEmail()).password(u.getPasswordHash()).authorities("ROLE_" + u.getRole().name()).build())
                .orElseThrow(() -> new UsernameNotFoundException("User not found."));
    }

    @Bean CorsConfigurationSource corsSource(@Value("${app.cors.allowed-origins}") String origins) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).filter(x -> !x.isBlank()).toList());
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", c);
        return source;
    }

    @Bean SecurityFilterChain chain(HttpSecurity http, JwtFilter filter, @Qualifier("corsSource") CorsConfigurationSource cors) throws Exception {
        http.csrf(x -> x.disable()).cors(x -> x.configurationSource(cors)).sessionManagement(x -> x.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(x -> x.authenticationEntryPoint((req, res, e) -> { res.setStatus(401); res.setContentType("application/json"); res.getWriter().write("{\"status\":\"error\",\"message\":\"Authentication required.\",\"data\":{}}"); })
                        .accessDeniedHandler((req, res, e) -> { res.setStatus(403); res.setContentType("application/json"); res.getWriter().write("{\"status\":\"error\",\"message\":\"You do not have permission to perform this action.\",\"data\":{}}"); }))
                .authorizeHttpRequests(x -> x.requestMatchers("/api/auth/**", "/api/accommodations/**", "/api/properties/**", "/api/contact", "/api/health").permitAll().requestMatchers("/api/admin/**").hasRole("ADMIN").anyRequest().authenticated())
                .addFilterBefore(filter, org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
