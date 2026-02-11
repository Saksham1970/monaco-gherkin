import io.cucumber.cucumberexpressions.ParameterType;
import io.cucumber.cucumberexpressions.ParameterTypeRegistry;
import java.lang.reflect.Method;
import java.util.Locale;

public class ParameterExtractor {
    private static final String DELIMITER_BEGIN = "--- BEGIN PARAMETER TYPES ---";
    private static final String DELIMITER_END = "--- END PARAMETER TYPES ---";
    private static final String FIELD_SEPARATOR = ":";
    private static final String REGEX_SEPARATOR = "|";

    public static void main(String[] args) {
        try {
            ParameterTypeRegistry registry = new ParameterTypeRegistry(Locale.ENGLISH);
            Iterable<ParameterType<?>> types = getParameterTypes(registry);

            System.out.println(DELIMITER_BEGIN);
            types.forEach(ParameterExtractor::printParameterType);
            System.out.println(DELIMITER_END);
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }

    private static Iterable<ParameterType<?>> getParameterTypes(ParameterTypeRegistry registry)
            throws Exception {
        Method method = registry.getClass().getDeclaredMethod("getParameterTypes");
        method.setAccessible(true);
        return (Iterable<ParameterType<?>>) method.invoke(registry);
    }

    private static void printParameterType(ParameterType<?> pt) {
        String regex = String.join(REGEX_SEPARATOR, pt.getRegexps());
        System.out.println(pt.getName() + FIELD_SEPARATOR + regex);
    }
}
