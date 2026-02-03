
import io.cucumber.cucumberexpressions.ParameterType;
import io.cucumber.cucumberexpressions.ParameterTypeRegistry;
import java.util.Locale;

public class ParameterExtractor {
    public static void main(String[] args) {
        try {
            ParameterTypeRegistry registry = new ParameterTypeRegistry(Locale.ENGLISH);

            System.out.println("--- BEGIN PARAMETER TYPES ---");

            // Output format: NAME:REGEX
            // Use reflection because getParameterTypes() is package-private in some
            // versions
            java.lang.reflect.Method getParameterTypesMethod = registry.getClass()
                    .getDeclaredMethod("getParameterTypes");
            getParameterTypesMethod.setAccessible(true);
            Iterable<ParameterType<?>> types = (Iterable<ParameterType<?>>) getParameterTypesMethod.invoke(registry);

            for (ParameterType<?> pt : types) {
                StringBuilder regexBuilder = new StringBuilder();
                for (String regex : pt.getRegexps()) {
                    if (regexBuilder.length() > 0)
                        regexBuilder.append("|");
                    regexBuilder.append(regex);
                }
                // Output format: NAME:REGEX
                System.out.println(pt.getName() + ":" + regexBuilder.toString());
            }
            System.out.println("--- END PARAMETER TYPES ---");
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }
}
