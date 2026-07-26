package com.crochet.ai.userservice.util;

public final class ValidationConstants {
    public static final String TEXT_REGEX = "^[^\\p{C}<>;\\\\]*$";
    public static final String TEXT_REGEX_MESSAGE = "Text contains invalid characters (< > ; \\ or control characters)";

    private ValidationConstants() {}
}
