package com.simplechat.backend.util;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.security.Key;
import java.util.Base64;

@Component
@Converter
public class AttributeEncryptor implements AttributeConverter<String, String> {

    private static final String AES = "AES";
    private final Key key;

    public AttributeEncryptor(@Value("${app.encryption.key}") String secret) {
        this.key = new SecretKeySpec(secret.getBytes(), AES);
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) return null;

        try {
            Cipher cipher = Cipher.getInstance(AES);
            cipher.init(Cipher.ENCRYPT_MODE, key);

            return Base64.getEncoder().encodeToString(cipher.doFinal(attribute.getBytes()));
        } catch (Exception e) {
            throw new IllegalStateException("Error encrypting message", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;

        try {
            Cipher cipher = Cipher.getInstance(AES);
            cipher.init(Cipher.DECRYPT_MODE, key);

            return new String(cipher.doFinal(Base64.getDecoder().decode(dbData)));
        } catch (Exception e) {
            throw new IllegalStateException("Error decrypting message", e);
        }
    }
}
