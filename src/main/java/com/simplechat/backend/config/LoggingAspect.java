package com.simplechat.backend.config;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import java.util.Arrays;

@Aspect
@Component
public class LoggingAspect {

    private final Logger log = LoggerFactory.getLogger(this.getClass());

    @Around("execution(* com.simplechat.backend..*Controller.*(..))")
    public Object logAround(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        String className = joinPoint.getSignature().getDeclaringTypeName();
        String methodName = joinPoint.getSignature().getName();
        String args = Arrays.toString(joinPoint.getArgs());

        log.info(">> ENTER: {}.{}() with args: {}", className, methodName, args);

        try {
            Object result = joinPoint.proceed();
            long elapsedTime = System.currentTimeMillis() - start;
            log.info("<< EXIT: {}.{}() - Finished in {}ms", className, methodName, elapsedTime);

            return result;
        } catch (IllegalArgumentException e) {
            log.error("!! ILLEGAL ARGUMENT: {} in {}.{}()", Arrays.toString(joinPoint.getArgs()), className, methodName);

            throw e;
        }
    }
}
