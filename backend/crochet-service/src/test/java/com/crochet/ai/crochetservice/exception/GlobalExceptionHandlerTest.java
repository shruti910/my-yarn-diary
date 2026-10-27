package com.crochet.ai.crochetservice.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Pins the invariant that a 5xx body never carries the raw exception message. */
class GlobalExceptionHandlerTest {

    private static final String LEAKY_DETAIL =
            "could not execute statement [ERROR: value too long for type character varying(30)]; "
                    + "constraint [yarns_colorway_check] on table [yarns]";

    private MockMvc mockMvc;

    @RestController
    static class ThrowingController {

        @GetMapping("/boom/runtime")
        String runtime() {
            throw new IllegalMonitorStateException(LEAKY_DETAIL);
        }

        @GetMapping("/boom/integrity")
        String integrity() {
            throw new DataIntegrityViolationException(LEAKY_DETAIL);
        }

        @GetMapping("/boom/bad-request")
        String badRequest() {
            throw new BadRequestException("Colorway must not exceed 30 characters.");
        }

        @GetMapping("/boom/not-found")
        String notFound() {
            throw new ResourceNotFoundException("Project not found.");
        }

        @PostMapping("/boom/body")
        String body(@RequestBody Map<String, Object> payload) {
            return String.valueOf(payload);
        }

        @GetMapping("/boom/no-resource")
        String noResource() throws NoResourceFoundException {
            throw new NoResourceFoundException(HttpMethod.GET, "/actuator/prometheus");
        }
    }

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new ThrowingController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("500 hides the exception message but keeps a traceId")
    void uncaughtExceptionDoesNotLeakItsMessage() throws Exception {
        mockMvc.perform(get("/boom/runtime"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value(not(containsString("character varying"))))
                .andExpect(jsonPath("$.message").value(not(containsString("yarns"))))
                .andExpect(jsonPath("$.message")
                        .value("An unexpected server error occurred. Please try again, quoting the trace ID."))
                .andExpect(jsonPath("$.traceId").isNotEmpty());
    }

    @Test
    @DisplayName("DataIntegrityViolationException becomes a generic 409")
    void dataIntegrityViolationIsGeneric() throws Exception {
        mockMvc.perform(get("/boom/integrity"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This change conflicts with existing data."))
                .andExpect(jsonPath("$.message").value(not(containsString("constraint"))))
                .andExpect(jsonPath("$.traceId").isNotEmpty());
    }

    @Test
    @DisplayName("Malformed JSON does not leak the parser's internals")
    void malformedBodyIsGeneric() throws Exception {
        mockMvc.perform(post("/boom/body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{bad json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Malformed request body."))
                .andExpect(jsonPath("$.message").value(not(containsString("JsonParseException"))));
    }

    // The 4xx branch must keep passing its message through: the frontend
    // surfaces it directly.
    @Test
    @DisplayName("400 still carries its own human-readable message")
    void badRequestKeepsItsMessage() throws Exception {
        mockMvc.perform(get("/boom/bad-request"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Colorway must not exceed 30 characters."));
    }

    @Test
    @DisplayName("404 still carries its own human-readable message")
    void notFoundKeepsItsMessage() throws Exception {
        mockMvc.perform(get("/boom/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Project not found."));
    }

    // Spring Boot 3.2+ raises NoResourceFoundException rather than
    // NoHandlerFoundException; without it mapped, unknown URLs became 500s.
    @Test
    @DisplayName("An unmatched path is a 404, not a 500")
    void unmatchedPathIsNotFound() throws Exception {
        mockMvc.perform(get("/boom/no-resource"))
                .andExpect(status().isNotFound());
    }
}
