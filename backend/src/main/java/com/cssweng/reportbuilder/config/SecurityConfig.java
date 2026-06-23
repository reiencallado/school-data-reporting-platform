package com.cssweng.reportbuilder.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

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

    // InMemory Bean to hold 3 hardcoded test accounts
    @Bean
    public UserDetailsService userDetailsService(PasswordEncoder encoder) {
        UserDetails admin = User.withUsername("admin")
                .password(encoder.encode("adminPass123"))
                .roles("ADMIN")
                .build();

        UserDetails schoolAdmin = User.withUsername("school_admin")
                .password(encoder.encode("schoolPass123"))
                .roles("SCHOOL_ADMIN")
                .build();

        UserDetails viewer = User.withUsername("viewer")
                .password(encoder.encode("viewerPass123"))
                .roles("VIEWER")
                .build();

        return new InMemoryUserDetailsManager(admin, schoolAdmin, viewer);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF protection since we are creating a stateless REST API
            .csrf(csrf -> csrf.disable())
            
            // Force session to be stateless
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Configure endpoint authorization rules
            .authorizeHttpRequests(auth -> auth
                // Allow public access to login AND old localstack tools
                .requestMatchers("/api/auth/login", "/api/localstack/**").permitAll()
                
                // Any other endpoint (like /api/users/me) still requires a valid login
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