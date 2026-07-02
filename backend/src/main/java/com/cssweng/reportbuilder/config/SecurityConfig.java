package com.cssweng.reportbuilder.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    // Password Encoder Bean to securely hash credentials
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // DELETED: The hardcoded UserDetailsService Bean is completely gone!

    // CORS configuration so the Angular dev server (localhost:4200) is allowed
    // to actually read responses from this API, for every HTTP method.
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:4200"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Register the CORS config above with Spring Security's filter chain
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Disable CSRF protection since we are creating a stateless REST API
            .csrf(csrf -> csrf.disable())

            // Force session to be stateless
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Configure endpoint authorization rules
            //.authorizeHttpRequests(auth -> auth
            //    // Allow public access to login and localstack
            //    .requestMatchers("/api/auth/login", "/api/localstack/**").permitAll()
            //    
            //    // TEMPORARY FIX: Allow anyone to CREATE a user to seed the database in Postman
                // (In production, lock this down and use a database seeding script instead)
            //    .requestMatchers(HttpMethod.POST, "/api/admin/users").permitAll()
                
                // Any other endpoint still requires a valid login
            //    .anyRequest().authenticated()
            //)
            // DEADASS COULDN'T UNDERSTAND WHY JWT KEPT BLOCKING MY AUTHENTICATION
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login", "/api/localstack/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/admin/users").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()   // ← add this
                .anyRequest().authenticated()
            )
            // Register the custom JWT filter to run before the standard authentication filter
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}