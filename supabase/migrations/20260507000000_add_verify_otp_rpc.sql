CREATE OR REPLACE FUNCTION verify_user_otp(submitted_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    otp_record RECORD;
    device_token TEXT;
BEGIN
    -- 1. Buscar o código mais recente e não usado para o usuário atual
    SELECT * INTO otp_record
    FROM public.user_otp_codes
    WHERE user_id = auth.uid()
      AND used = false
      AND code = submitted_code
    ORDER BY created_at DESC
    LIMIT 1;

    -- 2. Validar se encontrou
    IF otp_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Código inválido ou já utilizado.');
    END IF;

    -- 3. Validar expiração
    IF otp_record.expires_at < now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este código expirou. Peça um novo.');
    END IF;

    -- 4. Validar tentativas
    IF otp_record.attempts >= 5 THEN
        UPDATE public.user_otp_codes SET used = true WHERE id = otp_record.id;
        RETURN jsonb_build_object('success', false, 'error', 'Muitas tentativas. Código invalidado.');
    END IF;

    -- 5. Sucesso! Marcar como usado
    UPDATE public.user_otp_codes SET used = true WHERE id = otp_record.id;

    -- 6. Gerar Token de Dispositivo
    device_token := encode(gen_random_bytes(32), 'hex');
    
    INSERT INTO public.verified_devices (user_id, device_token, expires_at)
    VALUES (auth.uid(), device_token, now() + interval '30 days');

    RETURN jsonb_build_object('success', true, 'device_token', device_token);
END;
$$;
