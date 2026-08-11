package com.cssweng.reportbuilder.config;

import com.cssweng.reportbuilder.util.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtUtil jwtUtil;

  public JwtAuthenticationFilter(JwtUtil jwtUtil) {
    this.jwtUtil = jwtUtil;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
	  String path = request.getRequestURI();
	  // Do not run JWT validation on public login or setup routes, even if an old token is sent
	  return path.startsWith("/api/auth/") 
		  || path.startsWith("/api/v1/auth/") 
		  || path.startsWith("/api/localstack/");
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
    throws ServletException, IOException {

    String authHeader = request.getHeader("Authorization");

    // Check if the request contains a Bearer token
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
      String token = authHeader.substring(7);

      try {
        // Parse and verify the token using the secret key from JwtUtil
        Claims claims = Jwts.parser()
          .verifyWith(jwtUtil.getSecretKey())
          .build()
          .parseSignedClaims(token)
          .getPayload();

        String username = claims.getSubject();
        String role = claims.get("role", String.class);

        // If token is valid and context isn't already set, authenticate the user
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

          // Add both raw role and 'ROLE_' prefixed role to cover both hasRole() and hasAuthority()
          String rawRole = role != null ? role : "USER";
          String prefixedRole = rawRole.startsWith("ROLE_") ? rawRole : "ROLE_" + rawRole;

          List<SimpleGrantedAuthority> authorities = List.of(
            new SimpleGrantedAuthority(rawRole),
            new SimpleGrantedAuthority(prefixedRole)
          );

          UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(username, null, authorities);

          // Attach the extracted claims (like tenantId) to the authentication details
          authentication.setDetails(claims);

          SecurityContextHolder.getContext().setAuthentication(authentication);
        }
      } catch (Exception e) {
        // A Bearer token was sent but it's invalid/expired/tampered with.
        System.out.println("JWT validation failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\": \"Session expired. Please log in again.\"}");
        return;
      }
    }

    // Continue processing the request
    filterChain.doFilter(request, response);
  }
}
