CREATE TABLE audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    CONSTRAINT pk_audit_logs PRIMARY KEY (id)
);
