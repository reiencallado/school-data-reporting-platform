package com.cssweng.reportbuilder.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
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
@EnableMethodSecurity // Enables @PreAuthorize annotations in Controllers
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

      // Configure endpoint authorization rules.
      .authorizeHttpRequests(auth -> auth
        // Combined permitAll endpoints from both branches
        .requestMatchers("/api/auth/login", "/api/localstack/**", "/api/report-jobs/stream").permitAll()
        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
        .requestMatchers("/api/reports/webhook/**").permitAll()

        // Your custom authority checks for user creation
        .requestMatchers(HttpMethod.POST, "/api/admin/users").hasAnyAuthority("ADMIN", "ROLE_ADMIN", "SCHOOL_ADMIN", "ROLE_SCHOOL_ADMIN")

        // All other requests require a valid token
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
