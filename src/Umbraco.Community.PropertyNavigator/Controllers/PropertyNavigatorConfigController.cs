using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Api.Common.Attributes;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Community.PropertyNavigator.Configuration;

namespace Umbraco.Community.PropertyNavigator.Controllers;

// Serves the appsettings to the backoffice at /umbraco/management/api/v1/property-navigator/config (needs a bearer token).
[ApiVersion("1.0")]
[VersionedApiBackOfficeRoute(Constants.ApiName)]
[Authorize(Policy = AuthorizationPolicies.SectionAccessContent)]
[MapToApi(Constants.ApiName)]
[ApiExplorerSettings(GroupName = "Configuration")]
public class PropertyNavigatorConfigController : ManagementApiControllerBase
{
    private readonly IOptionsMonitor<PropertyNavigatorOptions> _options;

    public PropertyNavigatorConfigController(IOptionsMonitor<PropertyNavigatorOptions> options)
        => _options = options;

    // IOptionsMonitor, so appsettings edits apply on the next backoffice load without a restart.
    [HttpGet("config")]
    [ProducesResponseType<PropertyNavigatorOptions>(StatusCodes.Status200OK)]
    public PropertyNavigatorOptions GetConfig() => _options.CurrentValue;
}
